# --- START OF FILE app.py ---

from flask import Flask, request, jsonify
import requests
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
from config.db import db # Assuming this correctly imports your MongoDB connection object
from datetime import datetime
#Regex to search for pattern
import re
#import google generative
import google.generativeai as gen_ai

#Import ObjectId from the bson package (part of pymongo). Make sure pymongo is installed!
from bson import ObjectId

#Define config for logging - Good for seeing what's happening!
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__)
#Allow connection with frontend - Gotta let localhost:5173 (or your deployed domain) talk to us!
# TODO: Update origins list for production deployment!
CORS(app, origins=['http://localhost:5173', 'https://studyeasy.tech']) # Added production domain example

# Load environment variables from .env file - Keep secrets safe! Shhh!
load_dotenv()

#create an audio folder if not exist - Just a place to maybe put temp files. Make sure server has permissions!
os.makedirs("audio", exist_ok=True)

#Configure Google Generative AI - The magic brain! Let's hope it's smart today!
gen_ai.configure(api_key=os.getenv("GEN_AI"))

# API Token for Assembly AI - Gotta pay the bills (or use free tier)! Transcription magic!
aai.settings.api_key = os.getenv("ASSEMBLYAI_API_KEY")

#Google API Key for web searching - For fetching those resource links!
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
#Google Custom Search Engine ID - Tells Google *which* search engine to use.
GOOGLE_CSE_ID = os.getenv('GOOGLE_CSE_ID')

# Create a transcriber object - Ready to listen! 👂
transcriber = aai.Transcriber()

#Home route - Just to check if the server is alive and kicking! Ping Pong!
@app.route("/")
def home():
    logging.info("Home route accessed.")
    return {"msg": "Flask server is up and feeling groovy!"}


# --- !!! NEW ENDPOINT: Fetch Structure for Sidebar !!! ---
# This route provides the data needed to build the sidebar hierarchy.
@app.route('/api/structure', methods=['GET'])
def get_structure():
    """
    Fetches all documents and aggregates them to create the
    3-level nested structure { Subject: { Class: { Topic: {} } } } for the sidebar.
    """
    try:
        logging.info("Request received for /api/structure")
        # Fetch necessary fields (subject, class, topic) from ALL documents.
        # Projecting only these fields makes the query much faster! Efficiency matters!
        documents_cursor = db.Documents.find(
            {}, # Empty filter means "get all documents"
            {"subject": 1, "class": 1, "topic": 1, "_id": 0} # Projection: 1 = include, 0 = exclude
        )
        all_notes_list = list(documents_cursor) # Convert the database cursor to a list

        logging.info(f"Building structure from {len(all_notes_list)} notes retrieved from DB.")

        # --- Build the required nested structure --- Let's make this hierarchy! ---
        nestedStructure = {}
        notes_processed = 0
        for note in all_notes_list:
            # Use .get() for safety, in case a field is missing in some documents
            subject = note.get('subject')
            className = note.get('class') # Using 'class' key now!
            topicName = note.get('topic') # Using 'topic' key now!

            # Only include if all levels are present and non-empty strings
            if subject and className and topicName:
                # Create subject level if it doesn't exist yet
                if subject not in nestedStructure:
                    nestedStructure[subject] = {}
                # Create class level under the subject if it doesn't exist yet
                if className not in nestedStructure[subject]:
                    nestedStructure[subject][className] = {}
                # Add topic under the class. The empty {} just marks its existence.
                # We don't need deeper data for the structure itself.
                nestedStructure[subject][className][topicName] = {}
                notes_processed += 1
            else:
                # Warn if a document is missing the needed fields for structuring.
                logging.warning(f"Skipping note in structure due to missing fields: subject='{subject}', class='{className}', topic='{topicName}'")

        logging.info(f"Structure built successfully processing {notes_processed} valid notes.")
        # Return the final nested object as JSON! This is what Sidebar.jsx needs!
        return jsonify(nestedStructure), 200

    except Exception as e:
        logging.error(f"Error building structure via /api/structure: {e}", exc_info=True)
        return jsonify({"error": f"An internal server error occurred while building structure: {str(e)}"}), 500
# --- !!! END OF NEW /api/structure ENDPOINT !!! ---


# --- !!! NEW ENDPOINT: Fetch Content for Sidebar Selection !!! ---
# This is the route the frontend calls when a user clicks a specific topic!
@app.route('/api/content', methods=['GET']) # Or just '/content' - MUST match frontend fetch URL!
def get_content():
    """
    Fetches all note entries matching the provided subject, class, and topic
    from the query parameters. Returns a JSON array of note objects.
    """
    try:
        # Get parameters from request URL (e.g., /api/content?subject=Math&class=Calc%201&topic=Derivatives)
        subject = request.args.get('subject')
        class_name = request.args.get('class') # Use 'class' key to match frontend query
        topic = request.args.get('topic')
        logging.info(f"Request received for /api/content: subject='{subject}', class='{class_name}', topic='{topic}'")

        # Basic validation - Need all three to find the specific notes! Can't guess!
        if not subject or not class_name or not topic:
            logging.warning(f"/api/content called with missing parameters.")
            return jsonify({"error": "Missing required query parameters (subject, class, topic)"}), 400

        # Build the query for MongoDB - Let's find those notes!
        query = {
            "subject": subject,
            "class": class_name, # Query using 'class' key
            "topic": topic       # Query using 'topic' key
        }
        logging.info(f"Querying MongoDB for content with filter: {query}")

        # Find ALL documents matching the query criteria in the 'Documents' collection.
        documents_cursor = db.Documents.find(query)
        results_list = list(documents_cursor) # Convert cursor to a Python list

        # --- Important: Serialize data for JSON! --- Gotta make it web-friendly!
        # MongoDB ObjectIds and Python datetime objects aren't directly JSON serializable.
        serialized_list = []
        for doc in results_list:
            # Convert MongoDB ObjectId (_id) to its string representation
            if "_id" in doc and isinstance(doc["_id"], ObjectId):
                 doc["_id"] = str(doc["_id"])
            # Convert datetime object to a standard string format (ISO 8601 recommended)
            if "uploadDate" in doc and isinstance(doc.get("uploadDate"), datetime):
                # Adding 'Z' indicates UTC timezone, crucial for consistency!
                doc["uploadDate"] = doc["uploadDate"].isoformat() + "Z"
            # Ensure structuredResources is handled (should be okay if saved as list of dicts)
            # Add any other necessary serialization here...
            serialized_list.append(doc)

        logging.info(f"Found {len(serialized_list)} documents for query: {query}")

        # Return the list (even if it's empty []) as a JSON array! This is what ContentDisplay.jsx expects!
        return jsonify(serialized_list), 200

    except Exception as e:
        # Log the full error for debugging backend issues! Don't hide problems!
        logging.error(f"Error fetching content via /api/content: {e}", exc_info=True)
        return jsonify({"error": f"An internal server error occurred while fetching content: {str(e)}"}), 500
# --- !!! END OF NEW /api/content ENDPOINT !!! ---


#Route for Youtube Link upload - Handles when user pastes a YT link!
@app.route('/upload_link', methods=['POST'])
def upload_link():
    # Get the data sent from the frontend (should be JSON!)
    data = request.get_json()
    if not data:
        logging.warning("Received empty JSON data in /upload_link")
        return jsonify({"error": "Missing JSON data in request body"}), 400

    # --- FIX: Get 'url' key, not 'link' --- Gotta match the frontend payload!
    video_url = data.get('url') # <-- Changed 'link' to 'url'
    if not video_url or not isinstance(video_url, str) or not video_url.strip():
         logging.warning(f"Missing or invalid 'url' key in JSON data for /upload_link: {video_url}")
         return jsonify({"error": "Missing or invalid 'url' key in request body"}), 400

    # Using tempfile for safer temporary file handling
    try:
        # Create a temporary file structure that gets cleaned up automatically (mostly)
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create a base path inside the temp dir without an extension yet
            output_base = os.path.join(temp_dir, f"audio_{ObjectId()}") # Unique name
            logging.info(f"Attempting to download audio from: {video_url} to base {output_base}")

            # Download the audio file (function defined below)
            actual_output_path = download_audio(video_url, output_base) # Should return path like /tmp/xyz/audio_id.wav
            logging.info(f"Audio downloaded successfully to: {actual_output_path}")

            # Transcribe the downloaded audio (function defined below)
            # This function will also handle saving to DB and cleanup of this specific file
            return transcribe(actual_output_path)

    except Exception as e:
        logging.error(f"Error during URL upload process for {video_url}: {e}", exc_info=True)
        return jsonify({"error": f"Failed to process URL link: {str(e)}"}), 500

# Route just for testing database connection / fetching all raw data (keep for debugging?)
@app.route('/transcripts', methods=['GET'])
def get_transcripts():
    """ Returns ALL documents - useful for debugging, maybe remove later """
    try:
        logging.info("Fetching all documents from /transcripts...")
        documents = list(db.Documents.find())
        # Serialize ObjectId and Date for JSON response
        for doc in documents:
            if "_id" in doc and isinstance(doc["_id"], ObjectId):
                doc["_id"] = str(doc["_id"])
            if "uploadDate" in doc and isinstance(doc.get("uploadDate"), datetime):
                 doc["uploadDate"] = doc["uploadDate"].isoformat() + "Z"
        logging.info(f"Returning {len(documents)} documents from /transcripts.")
        return jsonify(documents)
    except Exception as e:
         logging.error(f"Error in /transcripts: {e}", exc_info=True)
         return jsonify({"error": f"An error occurred: {str(e)}"}), 500

# Route for deleting a specific note document by its ID
@app.route("/delete_document/<_id>", methods=['DELETE'])
def delete_document(_id):
    """ Deletes a document by its MongoDB ObjectId string """
    try:
        logging.info(f"Attempting to delete document with ID: {_id}")
        # Convert the ID string back to a MongoDB ObjectId. Handle potential errors.
        try:
            object_id_to_delete = ObjectId(_id)
        except Exception as invalid_id_error:
             logging.warning(f"Invalid ObjectId format received for deletion: {_id}")
             return jsonify({"error": f"Invalid ID format: {invalid_id_error}"}), 400

        result = db.Documents.delete_one({"_id": object_id_to_delete})

        if result.deleted_count == 1:
            logging.info(f"Successfully deleted document ID: {_id}")
            return jsonify({"message": "Document deleted successfully"}), 200
        else:
            # This means the delete operation ran but didn't find a matching document
            logging.warning(f"Document not found for deletion: ID {_id}")
            return jsonify({"error": "Document not found"}), 404
    except Exception as e: # Catch other potential errors during DB operation
        logging.error(f"Error deleting document ID {_id}: {e}", exc_info=True)
        return jsonify({"error": f"An error occurred during deletion: {str(e)}"}), 500


# === Helper Functions === Let's keep these organized! ===

# Download audio from the video URL provided
def download_audio(video_url, output_path_base):
    """ Downloads audio, saves as .wav, returns the full path including extension. """
    output_template = f"{output_path_base}.%(ext)s" # yt-dlp fills in the extension
    # Configure yt-dlp options
    ydl_opts = {
        'format': 'bestaudio/best', # Get the best audio-only stream
        'outtmpl': output_template, # Where to save and how to name it
        'postprocessors': [{
            'key': 'FFmpegExtractAudio', # Use FFmpeg to extract audio
            'preferredcodec': 'wav',      # Convert to WAV format
            'preferredquality': '192',    # Audio quality
        }],
        'keepvideo': False,       # Don't keep the video file after extraction
        'noplaylist': True,       # Only download single video, not playlist
        'logger': logging.getLogger('yt_dlp'), # Use our logger
        'quiet': False,           # Show output from yt-dlp
        'verbose': False,         # Don't be overly verbose unless debugging
        # 'progress_hooks': [lambda d: print(d['status']) if d['status']=='downloading' else None], # Example hook
    }
    # Expected final path after conversion to wav
    final_path = f"{output_path_base}.wav"

    try:
        logging.info(f"yt-dlp initiating download for {video_url}...")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Start the download! This might take a while...
            error_code = ydl.download([video_url])
            if error_code != 0:
                raise Exception(f"yt-dlp download returned error code: {error_code}")
        logging.info(f"yt-dlp finished download process.")

        # Double-check if the expected WAV file exists! Crucial!
        if not os.path.exists(final_path):
            logging.error(f"Expected output file MISSING after download: {final_path}")
            # Try listing files in the directory to see what WAS created
            temp_dir = os.path.dirname(final_path)
            files_in_dir = os.listdir(temp_dir)
            logging.error(f"Files found in temp directory '{temp_dir}': {files_in_dir}")
            raise FileNotFoundError(f"Audio file download failed or conversion error. Expected: {final_path}")

        logging.info(f"Confirmed audio file exists at: {final_path}")
        return final_path # Return the full path WITH the .wav extension!

    except Exception as e:
         # Log the error and re-raise it so the route handler knows something went wrong
         logging.error(f"yt-dlp processing failed for {video_url}: {e}", exc_info=True)
         raise # Re-raise the caught exception


# Transcribe the audio file, extract info, save to DB, clean up file.
def transcribe(audio_file_path):
    """ Transcribes audio, extracts keywords, saves to DB, cleans up file. """
    try:
        logging.info(f"Starting transcription for: {audio_file_path}")
        # Check if file exists before trying to transcribe it! Avoids confusing errors.
        if not os.path.exists(audio_file_path):
             logging.error(f"Audio file not found for transcription: {audio_file_path}")
             # No point continuing if the file isn't there.
             raise FileNotFoundError(f"Cannot transcribe non-existent file: {audio_file_path}")

        # --- Perform transcription using AssemblyAI --- This is where the magic happens!
        transcript = transcriber.transcribe(audio_file_path)
        logging.info("AssemblyAI transcription process completed.")

        # Check for transcription errors reported by AssemblyAI
        if transcript.status == aai.TranscriptStatus.error:
             logging.error(f"AssemblyAI transcription error: {transcript.error}")
             # Raise an exception with AssemblyAI's error message.
             raise Exception(f"Transcription failed: {transcript.error}")

        # Check if the transcription text is empty (might happen with silence or errors)
        if not transcript.text:
             logging.warning(f"Transcription result is empty for: {audio_file_path}")
             # Decide how to handle this - maybe save with empty transcript or raise error?
             # For now, let's raise an error as it's likely not useful.
             raise Exception("Transcription resulted in empty text.")
        logging.info("Transcription successful and text obtained.")

        # --- Extract keywords and metadata using Generative AI ---
        logging.info("Extracting keywords and generating summary via GenAI...")
        content = extract_keywords(transcript.text) # Function defined below
        logging.info(f"Extracted content from GenAI: {content}")

        # --- Search for resources based on extracted subtopics ---
        subtopics_list = content.get("subtopics", []) # Get list, default to empty
        logging.info(f"Searching for resources for {len(subtopics_list)} subtopics...")
        structured_resources = search_resources(subtopics_list)
        logging.info(f"Resource search complete.")

        # --- Prepare the document for MongoDB insertion ---
        # Ensure keys match frontend needs: 'class', 'topic'
        document = {
            'uploadDate': datetime.utcnow(), # Use UTC time! Standard practice.
            'topicsCovered': content.get("subtopics", []),
            'summary': content.get("summary", "Summary could not be generated."), # Default text
            'structuredResources': structured_resources,
            'transcript': transcript.text,
            'subject': content.get("subject", "Uncategorized"), # Provide defaults
            'class': content.get("class", "Uncategorized"),   # Use 'class' key
            'topic': content.get("topic", "Uncategorized")    # Use 'topic' key
        }

        # --- Insert the document into the database ---
        logging.info(f"Inserting document into MongoDB for topic: {document['topic']}")
        result = db.Documents.insert_one(document)
        inserted_id = result.inserted_id
        logging.info(f"Successfully inserted document with ID: {inserted_id}")

        # --- Return a success response to the frontend ---
        # We can just send back the ID, the frontend will refresh structure/content separately.
        return jsonify({
            "message": "Lecture processed and saved successfully!",
            "inserted_id": str(inserted_id) # Convert ObjectId to string for JSON
            }), 200 # HTTP 200 OK

    except Exception as e:
        # Catch any error during the process (file not found, transcription fail, DB fail, etc.)
        logging.error(f"Error during transcription/processing of {audio_file_path}: {e}", exc_info=True)
        # Return a detailed error response to the frontend
        return jsonify({"error": f"An error occurred during transcription/processing: {str(e)}"}), 500
    finally:
        # --- IMPORTANT: Cleanup --- Always try to delete the audio file afterwards!
        # This runs whether the try block succeeded or failed.
        logging.info(f"Attempting cleanup for: {audio_file_path}")
        clean_up(audio_file_path)


# Delete the audio file from the audio folder - Simple cleanup helper.
def clean_up(file_path):
    """ Safely removes a file if it exists. """
    # Check if path is valid and file exists before trying to delete
    if file_path and isinstance(file_path, str) and os.path.exists(file_path):
        try:
            os.remove(file_path)
            logging.info(f"Successfully cleaned up temporary file: {file_path}")
        except OSError as e:
            # Log error if deletion fails (e.g., permissions issue)
            logging.error(f"Error removing file {file_path}: {e}")
    else:
        # Log if file wasn't found or path was bad, helps debugging download issues.
        logging.info(f"File not found for cleanup or path invalid: {file_path}")


# Search Google/YouTube for resources based on subtopics list
def search_resources(subtopics):
    """ Finds Google/YouTube links for a list of subtopics. """
    topic_resources = []
    if not subtopics or not isinstance(subtopics, list): # Handle empty or non-list input
        logging.warning("No subtopics provided for resource search.")
        return [] # Return empty list

    logging.info(f"Searching resources for subtopics: {subtopics}")
    for topic in subtopics:
        # Ensure topic is a non-empty string before searching
        if not topic or not isinstance(topic, str) or not topic.strip():
            logging.warning(f"Skipping invalid subtopic for resource search: {topic}")
            continue # Skip to the next topic

        youtube_link = None # Initialize as None
        google_link = None

        try:
            # 1 YouTube video search
            logging.debug(f"Searching YouTube for: '{topic}'")
            youtube_result = google_search(topic.strip(), site_restrict="youtube.com")
            # Safely access nested data using .get()
            if youtube_result.get('items') and len(youtube_result['items']) > 0:
                youtube_link = youtube_result['items'][0].get('link')

            # 1 non-YouTube resource search
            logging.debug(f"Searching Google (non-YouTube) for: '{topic}'")
            non_video_result = google_search(topic.strip())
            if non_video_result.get('items'):
                for item in non_video_result['items']:
                    link = item.get('link')
                    # Check if link exists AND doesn't contain youtube.com
                    if link and "youtube.com" not in link:
                        google_link = link
                        logging.debug(f"Found non-YouTube link: {google_link}")
                        break # Found one, stop looking for this topic
        except Exception as e:
             # Log error but continue trying other topics
             logging.error(f"Error searching resources for topic '{topic}': {e}")

        # Append the results (links will be None if not found)
        topic_resources.append({
            "topic": topic.strip(), # Store the cleaned topic name
            "googleLink": google_link,
            "youtubeLink": youtube_link,
        })
    logging.info(f"Finished resource search. Processed {len(subtopics)} subtopics.")
    return topic_resources

# Helper for Google Search API calls
def google_search(query, site_restrict=None):
    """ Performs a Google Custom Search API request. Returns dict or {}. """
    if not GOOGLE_API_KEY or not GOOGLE_CSE_ID:
        logging.warning("Google API Key or CSE ID not configured. Skipping Google search.")
        return {}
    params = { 'key': GOOGLE_API_KEY, 'cx': GOOGLE_CSE_ID, 'q': query, 'num': 1 }
    if site_restrict: params['siteSearch'] = site_restrict
    try:
        # Make the request with a timeout! Don't hang forever!
        response = requests.get('https://www.googleapis.com/customsearch/v1', params=params, timeout=10)
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        return response.json() # Return parsed JSON
    except requests.exceptions.Timeout:
        logging.error(f"Google Search request timed out for query '{query}'.")
        return {}
    except requests.exceptions.RequestException as e:
        # Log other request errors (connection, HTTP errors)
        logging.error(f"Google Search request failed for query '{query}': {e}")
        return {} # Return empty dict on error


# Helper to extract specific values from LLM response using Regex
def extract_cleaned_value(pattern, text):
    """ Extracts value using regex, cleans whitespace and asterisks. Case-insensitive. """
    # Added re.IGNORECASE and re.MULTILINE for robustness
    match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
    if match and match.group(1): # Check if group 1 exists
        # Get group 1, remove leading/trailing whitespace and any asterisks
        return match.group(1).strip().replace("*", "").strip()
    # Log if pattern not found, helps debug LLM output changes
    logging.warning(f"Could not find pattern '{pattern}' in LLM output.")
    return None # Return None if not found


# Function to interact with Generative AI to get metadata
def extract_keywords(transcription):
    """ Sends transcript to GenAI, parses response for subject, class, topic, subtopics, summary. """
    # Make prompt clearer, emphasize structure, maybe limit transcript length
    # Limit transcript size sent to LLM to avoid exceeding token limits/costs
    MAX_TRANSCRIPT_CHARS = 15000 # Adjust as needed based on model limits
    truncated_transcript = transcription[:MAX_TRANSCRIPT_CHARS]
    if len(transcription) > MAX_TRANSCRIPT_CHARS:
        logging.warning(f"Transcript truncated to {MAX_TRANSCRIPT_CHARS} chars for GenAI prompt.")

    # Clearer instructions for the LLM
    prompt = f'''Analyze the following lecture transcript precisely and extract the requested information. Output *only* the numbered items, each on its own new line, using the exact labels shown.

        --- BEGIN LECTURE TRANSCRIPT ---
        {truncated_transcript}
        --- END LECTURE TRANSCRIPT ---

        Please provide:
        1. Subject: [The single, most likely broad academic subject, e.g., Computer Science, History, Biology]
        2. Class: [The single, most likely specific course name or level, e.g., CS 202 - Data Structures, US History 101, General Biology]
        3. Topic: [The single, main overarching topic of this specific lecture segment]
        4. Sub-Topics: [A comma-separated list of specific sub-topics or key concepts covered. List format: Topic A, Topic B, Topic C]
        5. Summary: [A single, concise sentence summarizing the core content of the lecture segment]

        Example Output:
        1. Subject: Computer Science
        2. Class: CS 202 - Data Structures
        3. Topic: Linked Lists Introduction
        4. Sub-Topics: Singly Linked Lists, Node Structure, Head Pointer, Traversal Basics
        5. Summary: The lecture introduced singly linked lists, covering node components, the head pointer, and how to traverse the list sequentially.
    '''
    try:
        logging.info("Sending prompt to Generative AI model...")
        model = gen_ai.GenerativeModel(model_name=os.getenv("MODEL_NAME"))
        # TODO: Consider adding safety_settings if needed for specific content
        # safety_settings = [...]
        # response = model.generate_content(prompt, safety_settings=safety_settings)
        response = model.generate_content(prompt)
        # Check for blocked response
        if not response.parts:
             logging.error("Generative AI response was empty or blocked.")
             raise Exception("Content generation failed or was blocked.")
        output_text = response.text
        logging.info("Received response from Generative AI.")
        # logging.debug(f"GenAI Raw Response Text:\n{output_text}") # Uncomment for debugging LLM output

        # Use updated regex patterns, handle potential missing lines more robustly
        subject = extract_cleaned_value(r"^\s*1\.\s+Subject:\s*(.+)$", output_text)
        class_name = extract_cleaned_value(r"^\s*2\.\s+Class:\s*(.+)$", output_text)
        topic = extract_cleaned_value(r"^\s*3\.\s+Topic:\s*(.+)$", output_text)
        subtopic_raw = extract_cleaned_value(r"^\s*4\.\s+Sub-Topics:\s*(.+)$", output_text)
        summary = extract_cleaned_value(r"^\s*5\.\s+Summary:\s*(.+)$", output_text)

        # Convert sub-topics into list of strings safely, handle potential variations
        subtopics = []
        if subtopic_raw:
            # Split by comma, strip whitespace from each item, filter out empty strings
            subtopics = [s.strip() for s in subtopic_raw.split(',') if s.strip()]

        # Prepare result, providing default values if parsing failed
        result_content = {
            "subject": subject or "Uncategorized",
            "class": class_name or "Uncategorized", # Use 'class' key here!
            "topic": topic or "Uncategorized",     # Use 'topic' key here!
            "subtopics": subtopics, # Will be empty list if parsing failed
            "summary": summary or "Summary could not be generated." # Default summary
        }
        logging.info(f"Parsed GenAI content: {result_content}")
        return result_content

    except Exception as e:
        logging.error(f"Error during Generative AI processing: {e}", exc_info=True)
        # Return default structure on error to prevent crashing the whole process
        return { "subject": "Error", "class": "Error", "topic": "Error Processing Transcript", "subtopics": [], "summary": "Failed to generate summary due to an error." }


# Main execution block when running the script directly (e.g., python app.py)
if __name__ == "__main__":
    print("Initializing StudyEZ Backend...")
    print("Connecting to MongoDB...")
    try:
        # Check the database connection using the 'ping' command
        db.command("ping")
        print("✅ MongoDB connection successful!")
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        print("❌ Please ensure MongoDB is running and accessible.")
        # Consider exiting if DB connection is critical: import sys; sys.exit(1)

    # Run the Flask development server!
    # debug=True automatically reloads on code changes, VERY useful for development.
    # Switch debug=False for production deployment!
    # Use host='0.0.0.0' to make it accessible from outside the local machine (e.g., other devices on network, Docker containers)
    print(f"🚀 Starting Flask server on http://0.0.0.0:5000 with debug={app.debug}...")
    app.run(host='0.0.0.0', port=5000, debug=True) # Use 0.0.0.0 for accessibility during dev/testing


# --- END OF FILE app.py ---
