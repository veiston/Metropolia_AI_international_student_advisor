import os
import json
from functools import lru_cache

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
    raise

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
    return (os.getenv("GEMINI_MODEL") or "gemini-2.5-flash").strip()


def _google_search_enabled() -> bool:
    # Default OFF for reliability on Vercel; enable explicitly when desired.
    return _truthy_env("GEMINI_ENABLE_GOOGLE_SEARCH")

@lru_cache(maxsize=1)
def _get_system_prompt() -> str:
    try:
        with open(SYSTEM_PROMPT_PATH, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        print(f"Warning: system_prompt.txt not found at {SYSTEM_PROMPT_PATH}")
        return "You are a helpful assistant."

def _get_client():
    """
    Factory method to get the GenAI Client instance.
    Validates API key before creating client.
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
        return genai.Client(api_key=api_key)
    except Exception as e:
        print(f"Error creating Gemini client: {e}")
        raise


def _build_stream_config(system_instruction: str, enable_search: bool) -> types.GenerateContentConfig:
    if enable_search:
        return types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=[types.Tool(google_search=types.GoogleSearch())],
            response_modalities=["TEXT"],
        )
    return types.GenerateContentConfig(
        system_instruction=system_instruction,
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

def query_gemini_stream(message, history=None):
    """
    Generates a streaming response from Gemini with Google Search grounding.
    Yields SSE-formatted JSON strings.
    """
    client = _get_client()
    
    contents = []
    if history:
        for msg in history:
            role = "model"
            if msg.get("role") == "user":
                role = "user"
            contents.append(types.Content(role=role, parts=[types.Part(text=msg.get("content"))]))
    
    contents.append(types.Content(role="user", parts=[types.Part(text=message)]))

    system_instruction = _get_system_prompt()

    model_name = _get_model_name()
    enable_search = _google_search_enabled()

    try:
        response_stream = client.models.generate_content_stream(
            model=model_name,
            contents=contents,
            config=_build_stream_config(system_instruction, enable_search),
        )

        for chunk in response_stream:
            if chunk.candidates and chunk.candidates[0].content and chunk.candidates[0].content.parts:
                text = chunk.candidates[0].content.parts[0].text
                if text:
                    yield f"data: {json.dumps({'text': text})}\n\n"
            
            # Handle citations if they appear in the chunk (usually last chunk)
            if chunk.candidates and chunk.candidates[0].grounding_metadata:
                 # Re-use logic from _process_response but adapted for stream
                 citations = []
                 gm = chunk.candidates[0].grounding_metadata
                 if gm.grounding_chunks:
                     for c in gm.grounding_chunks:
                         if c.web:
                             citations.append({"source": c.web.title, "url": c.web.uri})
                 if citations:
                     yield f"data: {json.dumps({'citations': citations})}\n\n"
    except errors.ClientError as e:
        # Retry without google_search if tooling is rejected.
        print(f"Gemini API ClientError: {e}")
        if enable_search and _should_retry_without_search(e):
            try:
                response_stream = client.models.generate_content_stream(
                    model=model_name,
                    contents=contents,
                    config=_build_stream_config(system_instruction, enable_search=False),
                )
                for chunk in response_stream:
                    if chunk.candidates and chunk.candidates[0].content and chunk.candidates[0].content.parts:
                        text = chunk.candidates[0].content.parts[0].text
                        if text:
                            yield f"data: {json.dumps({'text': text})}\n\n"
                yield "data: [DONE]\n\n"
                return
            except Exception as retry_exc:
                print(f"Gemini retry (no search) failed: {retry_exc}")

        if "RESOURCE_EXHAUSTED" in str(e):
            error_msg = "Quota exceeded. Please try again shortly."
        elif "NOT_FOUND" in str(e) or "not found" in str(e).lower():
            error_msg = f"Model '{model_name}' not available. Set GEMINI_MODEL to a valid model name."
        else:
            error_msg = "Could not reach Gemini service. Verify GEMINI_API_KEY and try again."

        yield f"data: {json.dumps({'text': f'\n\n**Error:** {error_msg}'})}\n\n"
    except Exception as e:
        print(f"Gemini API Unexpected Error: {e}")
        yield f"data: {json.dumps({'text': '\n\n**Error:** AI service error. Check Vercel logs and GEMINI_API_KEY.'})}\n\n"

    yield "data: [DONE]\n\n"

def analyze_document(content, filename):
    """
    Analyzes a document and returns JSON with analysis and checklist.
    Matches the signature expected by Server.py.
    """
    client = _get_client()
    model_name = _get_model_name()
    prompt = f"""
    Analyze the following document ({filename}) for clarity, tone, and compliance with Finnish bureaucratic standards.
    Identify any missing information or ambiguous language.
    Also, extract a checklist of action items if applicable.
    
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
            )
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
        # Clean up potential Markdown code blocks
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
