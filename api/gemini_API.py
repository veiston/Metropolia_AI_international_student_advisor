import os
import json
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SYSTEM_PROMPT_PATH = os.path.join(BASE_DIR, "system_prompt.txt")
DEFAULT_MODEL = "gemini-2.5-flash"
FALLBACK_MODEL = "gemini-2.5-flash-lite"
MAX_HISTORY_TURNS = 10
MAX_DOCUMENT_CHARS = 10000


def _get_system_prompt() -> str:
    try:
        with open(SYSTEM_PROMPT_PATH, "r", encoding="utf-8") as f:
            return f.read()
    except Exception:
        return "You are a helpful advisor for Metropolia students."


def _format_documents(documents) -> str:
    if not documents:
        return ""
    docs = []
    for d in documents:
        if isinstance(d, dict) and d.get("text"):
            name = d.get("name", "Doc")
            text = str(d["text"])[:MAX_DOCUMENT_CHARS]
            docs.append(f"Document: {name}\n{text}")
    return "\n---\n".join(docs)


def _extract_citations(chunk) -> list[dict]:
    try:
        cand = chunk.candidates[0]
        chunks = cand.grounding_metadata.grounding_chunks or []
        citations = []
        for c in chunks:
            if c.web and c.web.uri:
                title = c.web.title or c.web.uri
                citations.append({"source": title, "url": c.web.uri})
        return citations
    except Exception:
        return []


def _format_contents(message, history=None):
    contents = []
    recent_history = []
    if history:
        recent_history = history[-MAX_HISTORY_TURNS:]

    for msg in recent_history:
        if not isinstance(msg, dict):
            continue

        text = str(msg.get("content") or "").strip()
        if not text:
            continue
        if text.startswith("⚠️"):
            continue

        role = "user"
        if msg.get("role") in ["assistant", "model"]:
            role = "model"

        if not contents:
            if role != "user":
                continue
        if contents:
            if contents[-1].role == role:
                continue

        contents.append(types.Content(role=role, parts=[types.Part(text=text)]))

    if contents:
        if contents[-1].role == "user":
            contents.pop()

    contents.append(types.Content(role="user", parts=[types.Part(text=message)]))
    return contents


def _is_quota_error(error) -> bool:
    message = str(error).lower()
    if "resource_exhausted" in message:
        return True
    if "429" in message:
        return True
    if "quota" in message:
        return True
    return False


def query_gemini_stream(message, history=None, documents=None):
    client = genai.Client()
    contents = _format_contents(message, history)

    doc_context = _format_documents(documents)
    system_instruction = _get_system_prompt()
    if doc_context:
        system_instruction = f"{system_instruction}\n\nUploaded documents:\n{doc_context}"

    model_name = os.getenv("GEMINI_MODEL", DEFAULT_MODEL).strip()
    citations_seen = {}

    def stream_response(stream):
        for chunk in stream:
            text = chunk.text or ""
            if text:
                yield f"data: {json.dumps({'text': text})}\n\n"
            for cit in _extract_citations(chunk):
                if cit["url"] not in citations_seen:
                    citations_seen[cit["url"]] = cit
                    yield f"data: {json.dumps({'citations': list(citations_seen.values())})}\n\n"

    search_config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        tools=[types.Tool(google_search=types.GoogleSearch())],
    )
    basic_config = types.GenerateContentConfig(
        system_instruction=system_instruction,
    )

    call_sequence = [
        (model_name, search_config),
        (model_name, basic_config),
    ]
    if FALLBACK_MODEL != model_name:
        call_sequence.append((FALLBACK_MODEL, basic_config))

    last_error = None
    stream_started = False

    for attempt_model, attempt_config in call_sequence:
        try:
            stream = client.models.generate_content_stream(
                model=attempt_model,
                contents=contents,
                config=attempt_config,
            )
            yield from stream_response(stream)
            stream_started = True
            break
        except Exception as err:
            last_error = err
            print(f"Model {attempt_model} failed: {err}")

    if not stream_started:
        if last_error and _is_quota_error(last_error):
            quota_message = (
                "\n\n**Error:** Google Gemini API quota exceeded (HTTP 429). "
                "Your Google AI Studio key reached its free-tier rate or daily limit. "
                "Please verify quota at https://aistudio.google.com or switch to a paid API key."
            )
            yield f"data: {json.dumps({'text': quota_message})}\n\n"
        else:
            yield f"data: {json.dumps({'text': f'AI error: {last_error}'})}\n\n"

    yield "data: [DONE]\n\n"


def analyze_document(content, filename, mime_type=None):
    client = genai.Client()
    if isinstance(content, bytes):
        if mime_type and (mime_type.startswith("image/") or mime_type == "application/pdf"):
            part = types.Part.from_bytes(data=content, mime_type=mime_type)
        else:
            text = content.decode("utf-8", errors="ignore")
            part = types.Part(text=f"Document content:\n{text}")
    else:
        part = types.Part(text=f"Document content:\n{content}")

    prompt = f"""Review this student document: {filename}
Return JSON with:
{{
  "summary": "1-2 sentence summary of purpose",
  "checklist": [{{"title": "Step title", "description": "Details", "urgency": "High|Medium|Low"}}],
  "risks": "Deadlines or risks (empty if none)"
}}"""
    config = types.GenerateContentConfig(
        system_instruction=_get_system_prompt(),
        response_mime_type="application/json",
    )

    model_name = os.getenv("GEMINI_MODEL", DEFAULT_MODEL).strip()
    res = None
    try:
        res = client.models.generate_content(
            model=model_name,
            contents=[part, types.Part(text=prompt)],
            config=config,
        )
    except Exception as err:
        print(f"Document analysis with {model_name} failed: {err}. Trying fallback...")
        try:
            res = client.models.generate_content(
                model=FALLBACK_MODEL,
                contents=[part, types.Part(text=prompt)],
                config=config,
            )
        except Exception as fallback_err:
            print(f"Fallback analysis failed: {fallback_err}")
            return {
                "summary": "Document received, but AI analysis was rate-limited.",
                "checklist": [],
                "risks": "API quota exceeded. Please check your Gemini limits.",
            }

    raw_text = res.text or ""
    cleaned = raw_text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(cleaned)
    except Exception:
        return {"summary": cleaned, "checklist": [], "risks": ""}
