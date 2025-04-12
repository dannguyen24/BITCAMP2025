from flask import Flask, request, jsonify
from flask_cors import CORS
#Library for .env variable access
from dotenv import load_dotenv
#Library for loggging errors
import logging
#For manipulating paths
import os
#For transcriptions 
import assemblyai as aai
#for audio download from youtube link
import yt_dlp
from config.db import db
from datetime import datetime


# Import database configuration


#Define config for logging
logging.basicConfig(level=logging.INFO)


app = Flask(__name__)
#Allow connection with frontend
CORS(app, origins=['http://localhost:5173'])
load_dotenv()
#create an audio folder if not exist
os.makedirs("audio", exist_ok=True)

# API Token for 
aai.settings.api_key = os.getenv("ASSEMBLYAI_API_KEY")

# Create a transcriber object.
transcriber = aai.Transcriber()

#Home route
@app.route("/")
def home():
    return {"msg": "Flask server is up"}

#Route for Youtube Link upload
@app.route('/upload_link', methods=['POST'])
def upload_link():
    #Get the video url sent from front end
    data = request.get_json()
    video_url = data.get('link')
    #This is the path of where to store the audio. Audio will be named audio1
    output_path = os.path.join('audio', 'audio1')
    try:
        logging.info(f"Downloading audio from: {video_url}")
        #Download the audio files to audio folder by calling download_audio function
        download_audio(video_url, output_path)
        logging.info(f"Audio downloaded to: {output_path}")
        #Get transcription from the file path
        return transcribe(output_path)
    except Exception as e:
        logging.error(f"An error occurred: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/transcripts', methods=['GET'])
def get_transcripts():
    documents = list(db.Documents.find())
    for doc in documents:
        doc["_id"] = str(doc["_id"])  # Make it JSON serializable
    return jsonify(documents)


@app.route("/test", methods=['GET'])
def test():
    try:
        doc = db.Documents.find()
        return jsonify(doc), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    
#####SAI's CODE

GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
GOOGLE_CSE_ID = os.getenv('GOOGLE_CSE_ID')


def google_search(query, site_restrict=None):
    params = {
        'key': GOOGLE_API_KEY,
        'cx': GOOGLE_CSE_ID,
        'q': query,
        'num': 1  # Limit to 1 result
    }
    if site_restrict:
        params['siteSearch'] = site_restrict

    response = request.get('https://www.googleapis.com/customsearch/v1', params=params)
    if response.status_code == 200:
        return response.json()
    else:
        logging.error(f"Google Search API Error: {response.status_code}")
        return {}

@app.route("/search_resources", methods=["GET"])
def search_resources():
    topic = request.args.get('topic')

    if not topic:
        return jsonify({"error": "Missing topic parameter"}), 400

    resources = []

    # Fetch 1 YouTube video
    youtube_result = google_search(topic, site_restrict="youtube.com")
    if youtube_result.get('items'):
        video_item = youtube_result['items'][0]
        resources.append({
            "type": "video",
            "title": video_item['title'],
            "link": video_item['link'],
        })

    # Fetch 1 non-YouTube result
    non_video_result = google_search(topic)
    if non_video_result.get('items'):
        for item in non_video_result['items']:
            if "youtube.com" not in item['link']:
                resources.append({
                    "type": "article",
                    "title": item['title'],
                    "link": item['link'],
                })
                break

    return jsonify({"resources": resources})


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
        
        
#Transcribe the data and remove it after get the transcription
def transcribe(audio_path):
    try:
        #audio_path doesn't include the file type, so we have to use string concatenation to add ".wav"
        transcript = transcriber.transcribe(audio_path + ".wav")
        logging.info("Transcription completed")
        #Delete the audio file from the folder
        clean_up(audio_path + ".wav")
        
        #Add the transcription into mongoDB
        document = {
            'uploadDate': datetime(),
            'topicsCovered': [
                "Singly Linked Lists",
                "Node Structure",
                "Head Pointer",
                "Traversal"
            ],
            'summary': "Introduced the fundamental concepts of singly linked lists, including node creation, head pointers, and basic list traversal.",
            'structuredResources': [
                {
                    "topic": "Singly Linked Lists",
                    "googleLink": "https://www.geeksforgeeks.org/linked-list-set-1-introduction/",
                    "youtubeLink": "https://www.youtube.com/watch?v=njTh_OvY_zo"
                }
            ],
            'transcript': transcript.text,
            'subject': "Math",
            'class': "Calculus I",
            'topic': ""
        }
        result = db.Documents.insert_one(document)
        logging.info(f"Inserted document ID: {result.inserted_id}")

        
        #Generating creating summary from the transcription
        
        #Add summary to mongoDB
        
        logging.info("Temporary files cleaned up")
        return jsonify({
            "transcript": transcript.text,
            "inserted_id": str(result.inserted_id)
            })
    except Exception as e:
        logging.error(f"An error occurred: {e}")
        return jsonify({"error": str(e)}), 500


def clean_up(file_path):
    if os.path.exists(file_path):
        os.remove(file_path)
        

@app.route("/extract_keywords", methods=["GET"])
def extract_keywords():
    return "extract_keywords"

if __name__ == "__main__":
    print("Connecting to MongoDB...")
    try:
        db.command("ping") # If the connection is successful, MongoDB responds with: {"ok": 1.0}
        print("✅ MongoDB connection successful!")
    except Exception as e:
        print("❌ MongoDB connection failed:", e)
    
    app.run(debug=True, port=5000)
