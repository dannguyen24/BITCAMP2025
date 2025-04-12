from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import assemblyai as aai
import os


app = Flask(__name__)
CORS(app, origins=['http://localhost:5173'])
load_dotenv()

# Your API token is already set here
aai.settings.api_key = "11b9736728634dd29410f2be3a79e57a"

# Create a transcriber object.
transcriber = aai.Transcriber()

@app.route("/")
def home():
    return {"msg": "Flask server is up"}

@app.route('/upload', methods=['POST'])
def upload_video():
    file = request.files['file'] # name field in the input tag from frontend
    filepath = os.path.join("uploads", file.filename)
    file.save(filepath)  
    print("Received upload request") 
    return jsonify({"filename": file.filename})

@app.route('/upload_link', methods=['POST'])
def upload_link():
    data = request.get_json()
    file_link = data.get('link') #match key from frontend
    print(f'File is {file_link}')
    return jsonify({'received_link': file_link})
    
@app.route("/transcribe", methods=["GET"])
def transcribe():
    audio_url = request.args.get("url")  # Access the URL like ?url=your_audio_link
    transcript = transcriber.transcribe(audio_url)
    print(transcript.text)
    return jsonify({"transcript": transcript.text})

@app.route("/extract_keywords", methods=["GET"])
def extract_keywords():
    return "extract_keywords"

@app.route("/search_resources", methods=["GET"])
def search_resources():
    return "search_resources"

    

if __name__ == "__main__":
    app.run(debug=True, port=5000)
