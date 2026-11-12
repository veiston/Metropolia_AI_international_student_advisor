import os
from flask import Flask, request, jsonify, Response, stream_with_context, redirect
from flask_cors import CORS
from werkzeug.utils import secure_filename

try:
    from . import gemini_API
except Exception:
    import gemini_API

app = Flask(__name__)
CORS(app)


@app.route('/', methods=['GET'])
def root():
    return redirect('http://localhost:3000')


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"}), 200


@app.route('/api/ask', methods=['POST'])
def ask():
    data = request.get_json(silent=True) or {}
    query = data.get('query')
    if not query:
        return jsonify({"error": "No query provided"}), 400

    history = data.get('history', [])
    documents = data.get('documents', [])

    return Response(
        stream_with_context(gemini_API.query_gemini_stream(query, history, documents)),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
        },
    )


@app.route('/api/upload-doc', methods=['POST'])
def upload_doc():
    file = request.files.get('file')
    if not file:
        return jsonify({"error": "No file uploaded"}), 400
    if not file.filename:
        return jsonify({"error": "No file uploaded"}), 400

    filename = secure_filename(file.filename)
    file_content = file.read()

    mime_type = "text/plain"
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".pdf":
        mime_type = "application/pdf"
    if ext == ".png":
        mime_type = "image/png"
    if ext == ".jpg" or ext == ".jpeg":
        mime_type = "image/jpeg"
    if ext == ".webp":
        mime_type = "image/webp"

    payload = gemini_API.analyze_document(file_content, filename, mime_type)
    if not isinstance(payload, dict):
        payload = {"summary": str(payload), "checklist": [], "risks": ""}

    doc_text = payload.get("summary")
    if not doc_text:
        doc_text = f"Uploaded document: {filename}"

    payload["document"] = {
        "name": filename,
        "text": doc_text,
        "truncated": False,
    }
    return jsonify(payload)
