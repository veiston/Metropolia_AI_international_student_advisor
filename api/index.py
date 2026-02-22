from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from api import gemini, pdfutils
except ImportError:
    import gemini
    import pdfutils

app = Flask(__name__)

MAX_FILE_SIZE = 10 * 1024 * 1024
MAX_RETURN_CHARS = 20000
ALLOWED_EXTENSIONS = {'.pdf', '.txt'}


def _json_error(message: str, status: int):
    return jsonify({"error": message}), status

# CORS configuration
if os.getenv("VERCEL"):
    CORS(app, resources={r"/api/*": {"origins": ["*"]}})
else:
    CORS(app)


@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint for monitoring."""
    api_key_configured = bool(os.getenv("GEMINI_API_KEY"))
    return jsonify({
        "status": "healthy" if api_key_configured else "degraded",
        "api_key_configured": api_key_configured,
    }), 200 if api_key_configured else 503


@app.route('/api/ask', methods=['POST'])
def ask():
    data = request.get_json(silent=True)
    if not data:
        return _json_error("No data provided", 400)

    user_query = data.get('query')
    history = data.get('history', [])
    documents = data.get('documents', [])

    if not user_query:
        return _json_error("No query provided", 400)

    if not isinstance(user_query, str) or len(user_query.strip()) == 0:
        return _json_error("Query must be a non-empty string", 400)

    if not isinstance(history, list):
        return _json_error("History must be an array", 400)

    documents = documents or []
    if not isinstance(documents, list):
        return _json_error("Documents must be an array", 400)

    try:
        return Response(
            stream_with_context(gemini.query_gemini_stream(user_query, history, documents)),
            mimetype='text/event-stream',
        )
    except ValueError as e:
        print(f"ValueError in /api/ask: {e}")
        return _json_error(str(e), 500)
    except Exception as e:
        print(f"Unexpected error in /api/ask: {e}")
        return _json_error(f"AI service error: {str(e)}", 500)


@app.route('/api/upload-doc', methods=['POST'])
def upload_doc():
    file = request.files.get('file')
    if not file:
        return _json_error("No file part", 400)

    if file.filename == '':
        return _json_error("No selected file", 400)

    filename = secure_filename(file.filename or "uploaded_file")
    file_ext = os.path.splitext(filename)[1].lower()

    if file_ext not in ALLOWED_EXTENSIONS:
        return _json_error("File type not supported. Allowed: PDF, TXT", 400)

    file_content = file.read()
    if len(file_content) > MAX_FILE_SIZE:
        return _json_error("File too large. Maximum size is 10MB", 413)

    try:
        content = pdfutils.extract_text_from_pdf(file_content) if file_ext == '.pdf' else file_content.decode('utf-8')
    except Exception as e:
        return _json_error(f"Failed to read file: {str(e)}", 400)

    if not content:
        return _json_error("Could not extract text from file", 400)

    truncated = len(content) > MAX_RETURN_CHARS
    doc_text = content[:MAX_RETURN_CHARS]

    try:
        analysis = gemini.analyze_document(content, filename)
        response_payload: dict[str, object]
        if isinstance(analysis, dict):
            response_payload = dict(analysis)
        else:
            response_payload = {"summary": str(analysis)}

        response_payload["document"] = {
            "name": filename,
            "text": doc_text,
            "truncated": truncated,
        }
        return jsonify(response_payload)
    except Exception:
        return _json_error("AI analysis failed", 500)
