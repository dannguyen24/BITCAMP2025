# PyMongo is a Python package that you can use to connect to and communicate with MongoDB.python3 -m venv venv
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()
uri = os.getenv('MONGO_URI')
client = MongoClient(uri)
db = client["vidoes"]
