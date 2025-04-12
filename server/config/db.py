# PyMongo is a Python package that you can use to connect to and communicate with MongoDB.python3 -m venv venv
from pymongo import MongoClient
import os

uri = os.getenv('MONGO_URI')
client = MongoClient(uri)

try:
    database = client.get_database("sample_mflix")
    movies = database.get_collection("movies")
    print("success")
    client.close()

except Exception as e:
    raise Exception("Unable to find the document due to the following error: ", e)


