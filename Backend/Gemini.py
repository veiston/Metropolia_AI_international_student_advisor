import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# Configuration
MODEL_NAME = 'gemini-2.5-flash-preview-09-2025' 
API_KEY = os.getenv("GEMINI_API_KEY")
SYSTEM_PROMPT_PATH = "system_prompt.txt"

def _get_system_prompt():
    """
    Loads the system prompt from the file.
    """
    try:
        with open(SYSTEM_PROMPT_PATH, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        print("Warning: system_prompt.txt not found.")
        return "You are a helpful assistant."

def _get_client():
    """
    Factory method to get the GenAI Client instance.
    """
    if not API_KEY:
        raise ValueError("Gemini API Key is missing. Please configure it in the backend.")
    
    return genai.Client(api_key=API_KEY)

def _process_response(response):
    """
    Extracts text and citations from the response.
    Returns a dict: {'answer': text, 'citations': [list of dicts]}
    """
    if not response.candidates:
        return {"answer": "No response generated.", "citations": []}
    
    candidate = response.candidates[0]
    text_parts = []
    if candidate.content and candidate.content.parts:
        for part in candidate.content.parts:
            if part.text:
                text_parts.append(part.text)
    
    full_text = "\n".join(text_parts)
    
    citations = []
    if candidate.grounding_metadata and candidate.grounding_metadata.grounding_chunks:
        for chunk in candidate.grounding_metadata.grounding_chunks:
            if chunk.web:
                citations.append({
                    "source": chunk.web.title,
                    "url": chunk.web.uri,
                    "content": chunk.web.title # Fallback as we don't have snippet easily available
                })
                
    # Append citations to text for display if frontend doesn't handle them separately
    # if citations:
    #     full_text += "\n\n**Sources:**\n"
    #     for c in citations:
    #         full_text += f"- [{c['source']}]({c['url']})\n"

    return {
        "answer": full_text,
        "citations": citations
    }

def query_gemini(message, history=None):
    """
    Generates a response from Gemini with Google Search grounding.
    Matches the signature expected by Server.py.
    """
    client = _get_client()
    
    contents = []
    if history:
        for msg in history:
            role = "user" if msg.get("role") == "user" else "model"
            contents.append(types.Content(role=role, parts=[types.Part(text=msg.get("content"))]))
    
    contents.append(types.Content(role="user", parts=[types.Part(text=message)]))

    system_instruction = _get_system_prompt()

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=[types.Tool(google_search=types.GoogleSearch())],
            response_modalities=["TEXT"]
        )
    )
    
    return _process_response(response)

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
        # The SDK usually returns the text in response.text
        text_content = response.text or "{}"
        return json.loads(text_content)
    except Exception as e:
        print(f"Error parsing JSON from analyze_document: {e}")
        # Fallback
        return {
            "analysis": response.text or "Analysis failed.",
            "checklist": []
        }
