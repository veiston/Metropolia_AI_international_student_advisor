from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import Gemini
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/api/ask', methods=['POST'])
def ask():
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
        
    user_query = data.get('query')
    
    if not user_query:
        return jsonify({"error": "No query provided"}), 400

    response = Gemini.query_gemini(user_query)
    return jsonify(response)

@app.route('/api/upload-doc', methods=['POST'])
def upload_doc():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file:
        filename = secure_filename(file.filename or "uploaded_file")
        
        content = ""
        try:
            content = file.read().decode('utf-8')
        except UnicodeDecodeError:
            content = "Binary file content (PDF/Image) placeholder. In a real app, OCR/PDF extraction happens here."

        analysis = Gemini.analyze_document(content, filename)
        
        return jsonify(analysis)

@app.route('/api/check-form', methods=['POST'])
def check_form():
    return jsonify({"message": "Form checking endpoint implemented similar to upload-doc"})

@app.route('/api/auth', methods=['POST'])
def auth():
    return jsonify({"token": "demo-token", "user": "Student"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
