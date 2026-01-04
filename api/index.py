from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import sys

# Add parent directory to path for module imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from api import gemini, pdfutils
    from api.error_handlers import handle_api_error
except ImportError:
    # Fallback for Vercel
    import gemini
    import pdfutils
    from error_handlers import handle_api_error

app = Flask(__name__)

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
@handle_api_error
def ask():
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400

    user_query = data.get('query')
    history = data.get('history', [])
    documents = data.get('documents', [])

    if not user_query:
        return jsonify({"error": "No query provided"}), 400
    
    if not isinstance(user_query, str) or len(user_query.strip()) == 0:
        return jsonify({"error": "Query must be a non-empty string"}), 400
    
    # Validate history format
    if not isinstance(history, list):
        return jsonify({"error": "History must be an array"}), 400

    # Validate documents format
    if documents is None:
        documents = []
    if not isinstance(documents, list):
        return jsonify({"error": "Documents must be an array"}), 400

    try:
        return Response(
            stream_with_context(gemini.query_gemini_stream(user_query, history, documents)),
            mimetype='text/event-stream',
        )
    except ValueError as e:
        print(f"ValueError in /api/ask: {e}")
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        print(f"Unexpected error in /api/ask: {e}")
        return jsonify({"error": f"AI service error: {str(e)}"}), 500


@app.route('/api/upload-doc', methods=['POST'])
@handle_api_error
def upload_doc():
    # File size validation (10MB limit for Vercel)
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    filename = secure_filename(file.filename or "uploaded_file")
    
    # Validate file extension
    allowed_extensions = {'.pdf', '.txt'}
    file_ext = os.path.splitext(filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        return jsonify({"error": f"File type not supported. Allowed: PDF, TXT"}), 400

    # Read file content
    file_content = file.read()
    
    # Validate file size
    if len(file_content) > MAX_FILE_SIZE:
        return jsonify({"error": "File too large. Maximum size is 10MB"}), 413

    content = ""
    try:
        if filename.lower().endswith('.pdf'):
            content = pdfutils.extract_text_from_pdf(file_content)
        else:
            content = file_content.decode('utf-8')
    except Exception as e:
        return jsonify({"error": f"Failed to read file: {str(e)}"}), 400

    if not content:
        return jsonify({"error": "Could not extract text from file"}), 400

    # Return some document text to the frontend so it can be included in chat context.
    # Keep it bounded to avoid huge payloads.
    MAX_RETURN_CHARS = 20000
    doc_text = content
    truncated = False
    if len(doc_text) > MAX_RETURN_CHARS:
        doc_text = doc_text[:MAX_RETURN_CHARS]
        truncated = True

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
        return jsonify({"error": "AI analysis failed"}), 500
