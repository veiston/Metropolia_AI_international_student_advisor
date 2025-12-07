import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Fix: Use absolute path for .env and system_prompt.txt
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

# Configuration
MODEL_NAME = 'gemini-2.5-flash-preview-09-2025' 
API_KEY = os.getenv("GEMINI_API_KEY")
SYSTEM_PROMPT_PATH = os.path.join(BASE_DIR, "system_prompt.txt")

def _get_system_prompt():
    """
    Loads the system prompt from the file.
    """
    try:
        with open(SYSTEM_PROMPT_PATH, "r", encoding="utf-8") as f:
            print(f"Loaded system prompt from: {SYSTEM_PROMPT_PATH}")
            return f.read()
    except FileNotFoundError:
        print(f"Warning: system_prompt.txt not found at {SYSTEM_PROMPT_PATH}")

def _get_client():
    """
    Factory method to get the GenAI Client instance.
    """
    if not API_KEY:
        raise ValueError("Gemini API Key is missing. Please configure it in the backend.")
    
    return genai.Client(api_key=API_KEY)

def query_gemini_stream(message, history=None):
    """
    Generates a streaming response from Gemini with Google Search grounding.
    Yields SSE-formatted JSON strings.
    """
    client = _get_client()
    
    contents = []
    if history:
        for msg in history:
            role = "user" if msg.get("role") == "user" else "model"
            contents.append(types.Content(role=role, parts=[types.Part(text=msg.get("content"))]))
    
    contents.append(types.Content(role="user", parts=[types.Part(text=message)]))

    system_instruction = _get_system_prompt()

    response_stream = client.models.generate_content_stream(
        model=MODEL_NAME,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=[types.Tool(google_search=types.GoogleSearch())],
            response_modalities=["TEXT"]
        )
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

    yield "data: [DONE]\n\n"

def analyze_document(content, filename):
    """
    Analyzes a document and returns JSON with analysis and checklist.
    Matches the signature expected by Server.py.
    """
    client = _get_client()
    prompt = f"""
    Analyze the following document ({filename}) for clarity, tone, and compliance with Finnish bureaucratic standards.
    Identify any missing information or ambiguous language.
    Also, extract a checklist of action items if applicable.
    
    Document Content:
    {content}
    
    Output the result as a JSON object with the following keys:
    - "analysis": A string containing the detailed analysis.
    - "checklist": A list of strings representing the action items.
    """
    
    system_instruction = _get_system_prompt()

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            tools=[types.Tool(google_search=types.GoogleSearch())]
        )
    )
    
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
            "analysis": response.text or "Analysis failed.",
            "checklist": []
        }
