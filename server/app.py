#from flask import Flask, request, jsonify
from flask_cors import CORS

from flask import request, jsonify
import os
import fitz  # PyMuPDF
import pdfplumber
import docx
from moviepy.editor import VideoFileClip

app = Flask(__name__)
CORS(app)

@app.route("/")
def home():
    return {"msg": "Flask server is up"}

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {'pdf', 'docx', 'mp4', 'mov'}

@app.route('/upload_file', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    ext = file.filename.rsplit('.', 1)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({'error': 'File type not allowed'}), 400

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    extracted_text = ""

    if ext == 'pdf':
        extracted_text = extract_pdf(file_path)
    elif ext == 'docx':
        extracted_text = extract_docx(file_path)
    elif ext in ['mp4', 'mov']:
        extracted_text = transcribe_video(file_path)

    if not extracted_text:
        return jsonify({'error': 'Failed to extract text'}), 500

    # Continue your existing pipeline:
    # extract_keywords() -> store in MongoDB

    return jsonify({'message': 'File processed successfully', 'extracted_text': extracted_text})

def extract_pdf(path):
    text = ""
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text += page.extract_text() + "\n"
    return text

def extract_docx(path):
    doc = docx.Document(path)
    return "\n".join([para.text for para in doc.paragraphs])

def transcribe_video(path):
    audio_path = path.replace('.mp4', '.wav').replace('.mov', '.wav')
    clip = VideoFileClip(path)
    clip.audio.write_audiofile(audio_path)
    transcript = transcriber.transcribe(audio_path)
    clean_up(audio_path)
    return transcript.text


if __name__ == "__main__":
    app.run(debug=True, port=5000)
