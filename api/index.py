from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS

from api import gemini
from api import pdfutils
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)


@app.route('/api/ask', methods=['POST'])
def ask():
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400

    user_query = data.get('query')
    history = data.get('history', [])

    if not user_query:
        return jsonify({"error": "No query provided"}), 400

    return Response(
        stream_with_context(gemini.query_gemini_stream(user_query, history)),
        mimetype='text/event-stream',
    )


@app.route('/api/upload-doc', methods=['POST'])
def upload_doc():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    filename = secure_filename(file.filename or "uploaded_file")

    content = ""
    try:
        if filename.lower().endswith('.pdf'):
            content = pdfutils.extract_text_from_pdf(file.read())
        else:
            content = file.read().decode('utf-8')
    except Exception:
        return jsonify({"error": "Failed to read file"}), 400

    if not content:
        return jsonify({"error": "Could not extract text from file"}), 400

    try:
        analysis = gemini.analyze_document(content, filename)
        return jsonify(analysis)
    except Exception:
        return jsonify({"error": "AI analysis failed"}), 500
