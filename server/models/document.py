#MongoDB document structures — one for transcripts/information, 
from config.db import db
from datetime import datetime
from bson import ObjectId


def create_document(transcript, summary, subject, nameClass, nameTopic):
    document = {
        "transcript": transcript,
        "summary": summary,
        "subject": subject,
        "nameClass": nameClass, 
        "nameTopic": nameTopic,
        "createdAt": datetime(),
        "updatedAt": datetime()
    }
    result = db.documents.insert_one(document)
    return str(result.inserted_id)

def get_all_documents():
    return list(db.documents.find())

def get_document(document_id):
    return db.documents.find_one({"_id": ObjectId(document_id)})