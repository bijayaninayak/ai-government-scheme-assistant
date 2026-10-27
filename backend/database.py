from pymongo import MongoClient
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME")

if not MONGODB_URI or not DATABASE_NAME:
    raise RuntimeError(
        "MONGODB_URI and DATABASE_NAME must be set in your .env file"
    )

# Connect to MongoDB (give up after 5 seconds instead of hanging)
client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)

# Select database
db = client[DATABASE_NAME]

# Collection
scheme_collection = db["schemes"]
user_collection = db["users"]
