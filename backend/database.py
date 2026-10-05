from pymongo import MongoClient
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Connect to MongoDB
client = MongoClient(os.getenv("MONGODB_URI"))

# Select database
db = client[os.getenv("DATABASE_NAME")]

# Collection
scheme_collection = db["schemes"]
user_collection = db["users"]