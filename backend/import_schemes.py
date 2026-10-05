import json
from pathlib import Path
from database import scheme_collection

# Path to schemes.json
BASE_DIR = Path(__file__).resolve().parent.parent
json_file = BASE_DIR / "data" / "schemes.json"

# Read JSON
with open(json_file, "r", encoding="utf-8") as file:
    schemes = json.load(file)

# Clear old data
scheme_collection.delete_many({})

# Insert new data
scheme_collection.insert_many(schemes)

print(f"✅ {len(schemes)} schemes imported successfully!")