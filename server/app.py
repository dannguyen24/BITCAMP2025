from flask import Flask, request, jsonify
import requests
from flask_cors import CORS
#Library for .env variable access
from dotenv import load_dotenv

#For manipulating paths
import os
#For transcriptions 
import assemblyai as aai
#for audio download from youtube link
import yt_dlp
from config.db import db
from datetime import datetime
#Regex to search for pattern
import re
#import google generative
import google.generativeai as gen_ai

#Import ObjectId from the bson package (part of pymongo).
from bson import ObjectId
import fitz  # PyMuPDF
import pdfplumber
import docx
from moviepy import VideoFileClip




#Define config for logging
# logging.basicConfig(level=logging.INFO)

app = Flask(__name__)
#Allow connection with frontend
CORS(app, origins=['http://localhost:5173'])



UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
ALLOWED_EXTENSIONS = {'pdf', 'docx', 'mp4', 'mov'}


load_dotenv()

#create an audio folder if not exist
os.makedirs("audio", exist_ok=True)

#Added Generative AI agent
gen_ai.configure(api_key=os.getenv("GEN_AI"))

# API Token for Assembly AI
aai.settings.api_key = os.getenv("ASSEMBLYAI_API_KEY")

#Google API Key for web searching
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
#Something ..
GOOGLE_CSE_ID = os.getenv('GOOGLE_CSE_ID')

# Create a transcriber object.
transcriber = aai.Transcriber()

#==========================UPLOAD PDF, DOCX========================
@app.route('/upload_file', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    #extract the extention of the file and check if it's part of the list defined above
    ext = file.filename.rsplit('.', 1)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({'error': 'File type not allowed'}), 400

    try:
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
        content = extract_keywords(extracted_text)
        document = {
            'uploadDate': datetime.now(),
            'topicsCovered': content["subtopics"],
            'summary': content["summary"],
            'structuredResources': search_resources(content["subtopics"]),
            'transcript': extracted_text,
            'subject': content["subject"],
            'class': content["class"],
            'topic': content["topic"],
        }
        result = db.Documents.insert_one(document)
        # logging.info(f"Inserted document ID: {result.inserted_id}")


        # logging.info("Temporary files cleaned up")
        return jsonify({
            "success": True,
            "inserted_id": str(result.inserted_id)
        })
    except Exception as e:
        # logging.error(f"An error occurred: {e}")
        return jsonify({"error": str(e)}), 500


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

#==========================UPLOAD PDF, DOCX========================



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
        # logging.info(f"Downloading audio from: {video_url}")
        #Download the audio files to audio folder by calling download_audio function
        download_audio(video_url, output_path)
        # logging.info(f"Audio downloaded to: {output_path}")
        #Get transcription from the file path
        return transcribe(output_path)
    except Exception as e:
        # logging.error(f"An error occurred: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/transcripts', methods=['GET'])
def get_all_transcripts():
    documents = list(db.Documents.find())
    for doc in documents:
        doc["_id"] = str(doc["_id"])  # Make it JSON serializable
    return jsonify(documents)


@app.route('/content', methods=['GET'])
def get_content_by_subject_class_topic():
    try:
        # Extract query params
        subject = request.args.get('subject')
        class_name = request.args.get('class')
        topic = request.args.get('topic')

        # Basic validation
        if not subject or not class_name or not topic:
            return jsonify({"error": "Missing subject, class, or topic"}), 400

        # Query MongoDB
        query = {
            "subject": subject,
            "class": class_name,
            "topic": topic
        }
        print(f"Querying MongoDB with: {query}")
        results = list(db.Documents.find(query))

        # Convert ObjectId to string for frontend compatibility
        for r in results:
            r['_id'] = str(r['_id'])

        return jsonify(results), 200

    except Exception as e:
        print("Error in /content:", str(e))
        return jsonify({"error": str(e)}), 500

    
@app.route("/delete_document/<_id>", methods=['DELETE'])
def delete_document(_id):
    try:
        result = 0
        result = db.Documents.delete_one({"_id": ObjectId(_id)}) # {"_id": ObjectId("4d512b45cc9374271b02ec4f")
        if result.deleted_count == 0:
            return jsonify({"error": "Document not found"}), 404
        return jsonify({"message": "Document deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
   
   
#Download audio from the video uploaded
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
        # logging.info("Transcription completed")
        #Delete the audio file from the folder
        clean_up(audio_path + ".wav")
        
        #The recommendation given by Google AI
        content = extract_keywords(transcript.text)
        # result_content = {
        #     "subject": subject,
        #     "class": class_name,
        #     "topic": topic,
        #     "subtopics": subtopics,
        #     "summary": summary
        # }
        document = {
            'uploadDate': datetime.now(),
            'topicsCovered': content["subtopics"],
            'summary': content["summary"],
            'structuredResources': search_resources(content["subtopics"]),
            'transcript': transcript.text,
            'subject': content["subject"],
            'class': content["class"],
            'topic': content["topic"],
        }
        result = db.Documents.insert_one(document)
        # logging.info(f"Inserted document ID: {result.inserted_id}")

        
        #Generating creating summary from the transcription
        
        #Add summary to mongoDB
        
        # logging.info("Temporary files cleaned up")
        return jsonify({
            "transcript": transcript.text,
            "inserted_id": str(result.inserted_id)
            })
    except Exception as e:
        # logging.error(f"An error occurred: {e}")
        return jsonify({"error": str(e)}), 500

#Delete the audio file from the audio folder
def clean_up(file_path):
    if os.path.exists(file_path):
        os.remove(file_path)
        
#####SAI's CODE=================Start=========================================

def google_search(query, site_restrict=None):
    params = {
        'key': GOOGLE_API_KEY,
        'cx': GOOGLE_CSE_ID,
        'q': query,
        'num': 1  # Limit to 1 result
    }
    if site_restrict:
        params['siteSearch'] = site_restrict

    response = requests.get('https://www.googleapis.com/customsearch/v1', params=params)
    if response.status_code == 200:
        return response.json()
    else:
        logging.error(f"Google Search API Error: {response.status_code}")
        return {}

def search_resources(subtopics):
    # final_resources = {}
    topic_resources = []
    # subtopics = ["Singly Linked Lists", "Node Structure", "Head Pointer", "Traversal"]
    for topic in subtopics:
        
        youtube = ""
        google = ""
        # 1 YouTube video
        youtube_result = google_search(topic, site_restrict="youtube.com")
        if youtube_result.get('items'):
            video_item = youtube_result['items'][0]
            youtube = video_item['link']
         

        # 1 non-YouTube resource
        non_video_result = google_search(topic)
        if non_video_result.get('items'):
            for item in non_video_result['items']:
                if "youtube.com" not in item['link']:
                    google = item['link']
                  
                    break
        topic_resources.append({
            "topic": topic,
            "googleLink": google,
            "youtubeLink": youtube,
        })
      
    return topic_resources

#####SAI's CODE=================End=========================================


def extract_cleaned_value(pattern, text):
    match = re.search(pattern, text)
    if match:
        return match.group(1).replace("*", "").strip()
    return None

def extract_keywords(transcription):
    
    prompt = f'''
    You are an AI assistant helping a student break down a lecture note. Based on the content below:

        --- BEGIN LECTURE NOTE ---
        {transcription}
        --- END LECTURE NOTE ---

        Please output the following sections clearly:

        1. Subject: (umbrella subject that this student is studying (ex. History, Math, etc.) - only show most likely)
        2. Class: (the class of the subject the student is studying (ex. Calculus I, Calculus II, Data Structures) - only show most likely)
        3. Topic: Define the overarching topic (keyword)
        4. Sub-Topics: the sub-topics covered in a lecture [in a list seperated by ,]
        5. Summary: a concise and insightful one-sentence summary of the lecture

        Example:
        1. Subject: Computer Science
        2. Class: Data Structure
        3. Topic: Linked Lists
        4. Sub-Topics: Singly Linked Lists, Node Structure, Head Pointer, Traversal
    '''
    model = gen_ai.GenerativeModel(model_name=os.getenv("MODEL_NAME"))
    response = model.generate_content(prompt)
    output_text = response.text
    
    subject = extract_cleaned_value(r"Subject:\s*(.+)", output_text)
    class_name = extract_cleaned_value(r"Class:\s*(.+)", output_text)
    topic = extract_cleaned_value(r"Topic:\s*(.+)", output_text)
    subtopic_raw = extract_cleaned_value(r"Sub-Topics:\s*(.+)", output_text)
    summary = extract_cleaned_value(r"Summary:\s*(.+)", output_text)


    # Convert sub-topics into list of strings
    subtopics = [s.strip() for s in subtopic_raw.split(",")] if subtopic_raw else []
    
    result_content = {
        "subject": subject,
        "class": class_name,
        "topic": topic,
        "subtopics": subtopics,
        "summary": summary
    }
    return result_content

if __name__ == "__main__":
    print("Connecting to MongoDB...")
    try:
        db.command("ping") # If the connection is successful, MongoDB responds with: {"ok": 1.0}
        print("✅ MongoDB connection successful!")
    except Exception as e:
        print("❌ MongoDB connection failed:", e)
    
    app.run(debug=True, port=5000)
