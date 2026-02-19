import os
import json
from functools import lru_cache
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from dotenv import load_dotenv

# Serverless-friendly configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Only load .env in development (Vercel uses environment variables directly)
if not os.getenv("VERCEL"):
    env_path = os.path.join(BASE_DIR, ".env")
    if os.path.exists(env_path):
        load_dotenv(env_path)

# Import Google AI client (google-genai)
try:
    from google import genai
    from google.genai import types, errors
except ImportError as e:
    print(f"Error importing google.genai: {e}")
    # We do not raise immediately to allow the file to be imported for type checking,
    # but runtime calls will fail if this is missing.
    genai = None
    types = None
    errors = None

SYSTEM_PROMPT_PATH = os.path.join(BASE_DIR, "system_prompt.txt")


def _truthy_env(var_name: str) -> bool:
    value = (os.getenv(var_name) or "").strip().lower()
    return value in {"1", "true", "yes", "on"}


def _get_api_key() -> str:
    # Support a couple of common env var names to reduce deployment footguns.
    return (
        os.getenv("GEMINI_API_KEY")
        or os.getenv("GOOGLE_API_KEY")
        or ""
    )


def _get_model_name() -> str:
    # Defaults to 2.5-flash as requested, but can be overridden by env var.
    return (os.getenv("GEMINI_MODEL") or "gemini-2.5-flash").strip()


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


def _is_vertex_grounding_redirect(url: str) -> bool:
    try:
        parsed = urlparse(url)
        host = (parsed.hostname or "").lower()
        return "vertexaisearch.cloud.google.com" in host and "/grounding-api-redirect/" in (parsed.path or "")
    except Exception:
        return False


@lru_cache(maxsize=256)
def _resolve_grounding_redirect(url: str) -> str:
    """Resolve the Vertex AI Search grounding redirect URL to its final destination.

    This keeps the UI citations human-friendly. Uses short timeouts and falls back
    to the original URL on any failure.
    """
    if not url or not _is_vertex_grounding_redirect(url):
        return url

    # Try HEAD first (cheap). If not supported, fall back to a tiny GET.
    try:
        req = Request(url, method="HEAD", headers={"User-Agent": "metropolia-student-advisor/1.0"})
        with urlopen(req, timeout=2) as resp:
            final_url = resp.geturl() or url
            return final_url
    except Exception:
        try:
            req = Request(
                url,
                method="GET",
                headers={
                    "User-Agent": "metropolia-student-advisor/1.0",
                    # Ask for the smallest possible payload.
                    "Range": "bytes=0-0",
                },
            )
            with urlopen(req, timeout=2) as resp:
                final_url = resp.geturl() or url
                return final_url
        except Exception:
            return url


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
                resolved_url = _resolve_grounding_redirect(c.web.uri)
                title = c.web.title
                if _looks_like_generic_title(title):
                    title = _hostname_label(resolved_url)
                citations.append({
                    # Keep backward compatibility with existing frontend expectations.
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
    """
    Factory method to get the GenAI Client instance.
    Validates API key before creating (and caching) the client.
    """
    api_key = _get_api_key().strip()
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
        # Add Google Search tool.
        # Note: 'dynamic_retrieval_config' can be used here to force search
        # by setting threshold to 0.0, but default (dynamic) is usually best.
        tools = [types.Tool(google_search=types.GoogleSearch())]
        
    return types.GenerateContentConfig(
        system_instruction=system_instruction,
        tools=tools if tools else None,
        response_modalities=["TEXT"],
    )


def _should_retry_without_search(exc: Exception) -> bool:
    msg = str(exc)
    # Be conservative: only retry on common “tool not allowed / invalid argument” types of failures.
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
    
    # Updated prompt injection to be more explicit about using the tools provided
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
        # Retry without google_search if tooling is rejected.
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

                # Let the UI know we had to disable search grounding for this request.
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


def analyze_document(content, filename):
    try:
        client = _get_client()
    except Exception as e:
        return {"summary": "Configuration error.", "checklist": [], "risks": str(e)}

    model_name = _get_model_name()
    prompt = f"""
    Analyze the following document ({filename}) for any mistakes, what it is about and what to do with it best.
    Identify any missing information or ambiguous language or potential pitfalls or traps.
    Also, extract a checklist of action items if useful (not mandatory).
    
    Document Content:
    {content}
    
    Output the result as a JSON object with the following keys:
    - "summary": A brief summary of the document.
    - "checklist": A list of objects, each with:
        - "title": Short title of the action item.
        - "description": Detailed description.
        - "urgency": "High", "Medium", or "Low".
    - "risks": A string identifying any missing info or risks.
    """
    
    system_instruction = _get_system_prompt()

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
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
        # Attempt to parse the JSON response
        text_content = response.text or "{}"
        if text_content.startswith("```json"):
            text_content = text_content[7:]
        elif text_content.startswith("```"):
            text_content = text_content[3:]
        if text_content.endswith("```"):
            text_content = text_content[:-3]
        
        return json.loads(text_content.strip())
    except Exception as e:
        print(f"Error parsing JSON from analyze_document: {e}")
        # Fallback
        return {
            "summary": response.text or "Analysis failed.",
            "checklist": [],
            "risks": "Could not parse AI response."
        }