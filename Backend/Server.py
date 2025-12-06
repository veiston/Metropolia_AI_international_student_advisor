from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import Gemini
import db
from werkzeug.utils import secure_filename
import io
# import pypdf # Uncomment if pypdf is installed and needed for real PDF parsing

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Initialize DB
db.init_db()

@app.route('/api/ask', methods=['POST'])
def ask():
    data = request.json
    user_query = data.get('query')
    # In a real app, we might handle file content sent as text here too
    
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
        filename = secure_filename(file.filename)
        # For this demo, we will try to read text directly or mock PDF reading
        # In production, use pypdf or similar
        
        content = ""
        try:
            content = file.read().decode('utf-8')
        except:
            content = "Binary file content (PDF/Image) placeholder. In a real app, OCR/PDF extraction happens here."

        analysis = Gemini.analyze_document(content, filename)
        
        # Save checklist to DB
        if 'checklist' in analysis:
            checklist_id = db.save_checklist(analysis['checklist'])
            analysis['checklist_id'] = checklist_id

        return jsonify(analysis)

@app.route('/api/check-form', methods=['POST'])
def check_form():
    # Similar to upload-doc but specific prompt for forms
    return jsonify({"message": "Form checking endpoint implemented similar to upload-doc"})

@app.route('/api/checklist/<int:id>', methods=['GET'])
def get_checklist_route(id):
    checklist = db.get_checklist(id)
    if checklist:
        return jsonify(checklist)
    return jsonify({"error": "Checklist not found"}), 404

@app.route('/api/auth', methods=['POST'])
def auth():
    return jsonify({"token": "demo-token", "user": "Student"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
