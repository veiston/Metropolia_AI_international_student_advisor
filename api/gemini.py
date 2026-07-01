import os
import json
from functools import lru_cache
from urllib.parse import urlparse
from google import genai
from google.genai import types, errors
from dotenv import load_dotenv

# Serverless-friendly configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Only load .env in development (not in vercel)
if not os.getenv("VERCEL"):
    env_path = os.path.join(BASE_DIR, ".env")
    if os.path.exists(env_path):
        load_dotenv(env_path)


SYSTEM_PROMPT_PATH = os.path.join(BASE_DIR, "system_prompt.txt")


def _truthy_env(var_name: str) -> bool:
    value = (os.getenv(var_name) or "").strip().lower()
    return value in {"1", "true", "yes", "on"}


def _get_model_name() -> str:
    # Defaults to 3.5-flash as , but can be overridden by env var.
    return (os.getenv("GEMINI_MODEL") or "gemini-3.5-flash").strip()


def _google_search_enabled() -> bool:
    # Default ON (user requirement). Can be disabled explicitly.
    if os.getenv("GEMINI_ENABLE_GOOGLE_SEARCH") is None:
        return True
    return _truthy_env("GEMINI_ENABLE_GOOGLE_SEARCH")


def _format_documents(documents) -> str:
    if not documents:
        return ""

    safe_docs = []
    for doc in documents:
        if not isinstance(doc, dict):
            continue
        name = (doc.get("name") or "document").strip()
        text = doc.get("text") or ""
        if not isinstance(text, str):
            continue
        text = text.strip()
        if not text:
            continue
        safe_docs.append((name, text))

    if not safe_docs:
        return ""

    parts = [
        "You also have access to the following uploaded document(s).",
        "Use them to answer questions about the user's uploaded files.",
        "If the user asks about the document, quote or paraphrase from it.",
        "When you use web information, provide sources via citations.",
        "---",
    ]

    for name, text in safe_docs:
        parts.append(f"Document: {name}")
        parts.append(text)
        parts.append("---")

    return "\n".join(parts)


def _looks_like_generic_title(title: str | None) -> bool:
    if not title:
        return True
    t = title.strip().lower()
    return t in {"web source", "source", ""}


def _hostname_label(url: str) -> str:
    try:
        parsed = urlparse(url)
        host = (parsed.hostname or "").lower()
        if host.startswith("www."):
            host = host[4:]
        return host or "Source"
    except Exception:
        return "Source"


def _extract_citations_from_chunk(chunk) -> list[dict]:
    """
    Extracts citation metadata from a streaming chunk.
    Works with google-genai SDK v0.3+ structure.
    """
    citations = []
    try:
        if not (chunk and chunk.candidates):
            return citations
        
        # Check first candidate
        cand = chunk.candidates[0]
        if not cand.grounding_metadata:
            return citations
            
        gm = cand.grounding_metadata
        if not gm.grounding_chunks:
            return citations
            
        for c in gm.grounding_chunks:
            if c.web and c.web.uri:
                resolved_url = c.web.uri
                title = c.web.title
                if _looks_like_generic_title(title):
                    title = _hostname_label(resolved_url)
                citations.append({
                    "source": title or resolved_url,
                    "content": title or resolved_url,
                    "url": resolved_url,
                    "original_url": c.web.uri,
                })
    except Exception:
        # Swallow parsing errors during stream to avoid breaking the chat
        return []
    return citations


@lru_cache(maxsize=1)
def _get_system_prompt() -> str:
    try:
        with open(SYSTEM_PROMPT_PATH, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        print(f"Warning: system_prompt.txt not found at {SYSTEM_PROMPT_PATH}")
        return "You are a helpful assistant."


@lru_cache(maxsize=1)
def _get_cached_client(api_key: str):
    if genai is None:
        raise ImportError("The 'google-genai' library is not installed.")
    return genai.Client(api_key=api_key)


def _get_client():
    """AI client instance and validate api key"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        error_msg = (
            "Gemini API Key is missing or empty. "
            "Set GEMINI_API_KEY (recommended) in Vercel Project → Settings → Environment Variables."
        )
        print(f"ERROR: {error_msg}")
        raise ValueError(error_msg)

    try:
        return _get_cached_client(api_key)
    except Exception as e:
        print(f"Error creating Gemini client: {e}")
        # Clear cache on error to avoid poisoning subsequent calls.
        _get_cached_client.cache_clear()
        raise


def _build_stream_config(system_instruction: str, enable_search: bool):
    if types is None:
        raise ImportError("The 'google-genai' library is not installed.")
    
    tools = []
    if enable_search:
        tools = [types.Tool(google_search=types.GoogleSearch())]
        
    return types.GenerateContentConfig(
        system_instruction=system_instruction,
        tools=tools if tools else None,
        response_modalities=["TEXT"],
    )


def _should_retry_without_search(exc: Exception) -> bool:
    msg = str(exc)
    retry_markers = [
        "INVALID_ARGUMENT",
        "google_search",
        "tools",
        "not supported",
        "permission",
        "PERMISSION_DENIED",
    ]
    return any(marker in msg for marker in retry_markers)


def _extract_text_from_chunk(chunk) -> str:
    try:
        if chunk.candidates and chunk.candidates[0].content and chunk.candidates[0].content.parts:
            return chunk.candidates[0].content.parts[0].text or ""
    except Exception:
        return ""
    return ""


def _stream_text_and_citations(response_stream, citations_seen: dict[str, dict]):
    for chunk in response_stream:
        text = _extract_text_from_chunk(chunk)
        if text:
            yield f"data: {json.dumps({'text': text})}\n\n"

        for cit in _extract_citations_from_chunk(chunk):
            url = cit.get("url")
            if url and url not in citations_seen:
                citations_seen[url] = cit
        
        if citations_seen:
             # We send the whole list so the UI can de-dupe or replace
            yield f"data: {json.dumps({'citations': list(citations_seen.values())})}\n\n"


def query_gemini_stream(message, history=None, documents=None):
    if types is None:
        yield f"data: {json.dumps({'text': '**Configuration Error:** The google-genai library is not installed.'})}\n\n"
        yield "data: [DONE]\n\n"
        return
    
    try:
        client = _get_client()
    except Exception as e:
        yield f"data: {json.dumps({'text': f'**Configuration Error:** {str(e)}'})}\n\n"
        yield "data: [DONE]\n\n"
        return

    contents = []
    if history:
        for msg in history:
            role = "model"
            if msg.get("role") == "user":
                role = "user"
            contents.append(types.Content(role=role, parts=[types.Part(text=msg.get("content"))]))
    
    contents.append(types.Content(role="user", parts=[types.Part(text=message)]))

    base_system_instruction = _get_system_prompt()
    doc_context = _format_documents(documents)
    
    system_instruction = (
        base_system_instruction
        + ("\n\n" + doc_context if doc_context else "")
        + "\n\nIMPORTANT: Use Google Search grounding when enabled so the UI can show reliable Sources."
    )

    model_name = _get_model_name()
    enable_search = _google_search_enabled()

    citations_seen: dict[str, dict] = {}

    try:
        response_stream = client.models.generate_content_stream(
            model=model_name,
            contents=contents,
            config=_build_stream_config(system_instruction, enable_search),
        )

        for payload in _stream_text_and_citations(response_stream, citations_seen):
            yield payload

    except Exception as e:
        # Retry without google_search if tool call is rejected.
        print(f"Gemini API Error: {e}")
        
        if enable_search and _should_retry_without_search(e):
            try:
                print(f"Retrying {model_name} without search tools...")
                response_stream = client.models.generate_content_stream(
                    model=model_name,
                    contents=contents,
                    config=_build_stream_config(system_instruction, enable_search=False),
                )
                for payload in _stream_text_and_citations(response_stream, citations_seen):
                    yield payload

                # Let the UI people know we had to disable search grounding for this request.
                yield f"data: {json.dumps({'text': '\n\n_Note: Google Search grounding was unavailable for this request; responding without live web grounding._'})}\n\n"
                yield "data: [DONE]\n\n"
                return
            except Exception as retry_exc:
                print(f"Gemini retry (no search) failed: {retry_exc}")

        if "RESOURCE_EXHAUSTED" in str(e):
            error_msg = "Quota exceeded. Please try again shortly."
        elif "NOT_FOUND" in str(e) or "not found" in str(e).lower():
            error_msg = f"Model '{model_name}' not available. Verify GEMINI_MODEL."
        else:
            error_msg = f"Gemini Service Error: {str(e)}"

        yield f"data: {json.dumps({'text': f'\n\n**Error:** {error_msg}'})}\n\n"


def analyze_document(content, filename, mime_type=None):
    try:
        client = _get_client()
    except Exception as e:
        return {"summary": "Configuration error.", "checklist": [], "risks": str(e)}

    model_name = _get_model_name()
    
    if mime_type == "application/pdf":
        input_part = types.Part.from_bytes(data=content, mime_type=mime_type)
        doc_content_instruction = "Analyze the attached PDF document."
        contents = [input_part]
    else:
        doc_content_instruction = f"Document content:\n{content}"
        contents = []

    prompt = f"""
        You are reviewing a document submitted by a Metropolia student: {filename}

        Assume the sender is a university student who needs practical guidance to complete, answer, or submit this document correctly.
        Focus on actionable next steps, not generic explanation.

        Analyze the document and extract when useful:
        1) What this document is for (short, concrete summary).
        2) Exact actions the student should take next.
        3) Missing information, deadlines, submission risks, and common mistakes.

        {doc_content_instruction}

        Evaluate the students and the documents goals. Try to help the student as much as possible.
        - Prefer wording like "Do X", "Fill Y", "Submit Z".
        - If a field name appears in the document, mention it explicitly.
        - Do not include markdown, prose outside JSON, or code fences.
        """
    
    system_instruction = _get_system_prompt()

    try:
        contents.append(prompt)
        response = client.models.generate_content(
            model=model_name,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json"
            ) if types else None
        )
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return {
            "summary": "Error communicating with AI service.",
            "checklist": [],
            "risks": str(e)
        }
    
    try:
        # Parse the JSON response
        text_content = response.text or "{}"
        if text_content.startswith("```json"):
            text_content = text_content[7:]
        elif text_content.startswith("```"):
            text_content = text_content[3:]
        if text_content.endswith("```"):
            text_content = text_content[:-3]
        
        parsed = json.loads(text_content.strip())

        if not isinstance(parsed, dict):
            raise ValueError("Parsed analysis is not a JSON object")

        summary = parsed.get("summary")
        risks = parsed.get("risks")
        raw_checklist = parsed.get("checklist")

        normalized_items = []
        if isinstance(raw_checklist, list):
            for item in raw_checklist:
                if not isinstance(item, dict):
                    continue
                title = str(item.get("title") or "").strip()
                description = str(item.get("description") or "").strip()
                urgency_raw = str(item.get("urgency") or "Medium").strip().lower()

                if not title and description:
                    title = "Next step"
                if not description:
                    continue

                if urgency_raw == "high":
                    urgency = "High"
                elif urgency_raw == "low":
                    urgency = "Low"
                else:
                    urgency = "Medium"

                normalized_items.append({
                    "title": title or "Next step",
                    "description": description,
                    "urgency": urgency,
                })

        if not normalized_items and isinstance(summary, str) and summary.strip():
            normalized_items = [{
                "title": "Read instructions and prepare required information",
                "description": "Review the document carefully, identify required fields, and gather missing details before submission.",
                "urgency": "High",
            }]

        return {
            "summary": str(summary or "").strip(),
            "checklist": normalized_items,
            "risks": str(risks or "").strip(),
        }
    except Exception as e:
        print(f"Error parsing JSON from analyze_document: {e}")
        # Fallback
        return {
            "summary": response.text or "Analysis failed.",
            "checklist": [],
            "risks": "Could not parse AI response."
        }
