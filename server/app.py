from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=['http://localhost:5173'])

@app.route("/")
def home():
    return {"msg": "Flask server is up"}

@app.route('/upload', methods=['POST'])
def upload_video():
    
    file = request.files['file'] # name field in the input tag from frontend
    print("Received upload request") 
    return file.name

@app.route("/analyze", methods=["POST"])
def analyze():
    return "analyze"
    
def extractAudio():
    pass

def audioToText():
    pass


    

if __name__ == "__main__":
    app.run(debug=True, port=5000)
