from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from moviepy import VideoFileClip
from pytube import YouTube
from pytube.exceptions import VideoUnavailable
import ffmpeg
import logging
import os
import assemblyai as aai
import yt_dlp

logging.basicConfig(level=logging.INFO)


app = Flask(__name__)
CORS(app, origins=['http://localhost:5173'])
load_dotenv()
os.makedirs("audio", exist_ok=True)

# Your API token is already set here
aai.settings.api_key = "11b9736728634dd29410f2be3a79e57a"

# Create a transcriber object.
transcriber = aai.Transcriber()

@app.route("/")
def home():
    return {"msg": "Flask server is up"}

@app.route('/upload', methods=['POST'])
def upload_video():
    #Save videos to uploads video 
    file = request.files['file'] # name field in the input tag from frontend
    video_path = os.path.join("uploads", file.filename)
    file.save(video_path)  
    
    
    # Extract the audio from 
    audio_path = convert_video_to_audio(video_path)
    print("Received upload request") 
    return jsonify({"filename": file.filename})

def convert_video_to_audio(video_path):
    pass

@app.route('/upload_link', methods=['POST'])
def upload_link():
    data = request.get_json()
    video_url = data.get('link')
    output_path = os.path.join('audio', 'audio.wav')
    
    try:
        logging.info(f"Downloading audio from: {video_url}")
        download_audio(video_url, output_path)
        logging.info(f"Audio downloaded to: {output_path}")
        
        transcript_text = transcribe(output_path)
        logging.info("Transcription completed")
        
        clean_up(output_path)
        logging.info("Temporary files cleaned up")
        
        return jsonify({"transcript": transcript_text})
    except Exception as e:
        logging.error(f"An error occurred: {e}")
        return jsonify({"error": str(e)}), 500

def download_audio(video_url, output_path):
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': output_path,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'wav',
            'preferredquality': '192',
        }],
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([video_url])


def transcribe(audio_path):
    # Upload local audio file to AssemblyAI
    upload_url = transcriber.upload_file(audio_path)
    
    # Transcribe using the upload URL
    transcript = transcriber.transcribe(upload_url)
    print(transcript.text)
    return jsonify({"transcript": transcript.text})

def clean_up(file_path):
    if os.path.exists(file_path):
        os.remove(file_path)

@app.route("/extract_keywords", methods=["GET"])
def extract_keywords():
    return "extract_keywords"

@app.route("/search_resources", methods=["GET"])
def search_resources():
    return "search_resources"

    

if __name__ == "__main__":
    app.run(debug=True, port=5000)
