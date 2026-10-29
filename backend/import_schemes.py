"""Loads data/schemes.json into the MongoDB `schemes` collection.

Run it from the project's main folder:

    python -m backend.import_schemes            (add or update the schemes)
    python -m backend.import_schemes --prune    (also delete schemes that are
                                                 not in schemes.json)

By default nothing is deleted: a scheme is updated if its id already exists
and added if not.
"""
import json
import sys
from pathlib import Path

try:
    from backend.database import scheme_collection
except ModuleNotFoundError:  # run as `python import_schemes.py` inside backend/
    from database import scheme_collection

# Path to schemes.json
BASE_DIR = Path(__file__).resolve().parent.parent
json_file = BASE_DIR / "data" / "schemes.json"

# Read JSON
with open(json_file, "r", encoding="utf-8") as file:
    schemes = json.load(file)

# Refuse to import wrong data (see backend/validate_schemes.py for the rules)
try:
    from backend.validate_schemes import validate
except ModuleNotFoundError:  # run as `python import_schemes.py` inside backend/
    from validate_schemes import validate

errors, warnings = validate(schemes)
for message in warnings:
    print("Warning:", message)
if errors:
    for message in errors:
        print("ERROR:", message)
    sys.exit(f"Stopped: {len(errors)} error(s) in data/schemes.json. Nothing was imported.")

ids = [scheme["id"] for scheme in schemes]

# Each scheme has a unique integer id
scheme_collection.create_index("id", unique=True)

for scheme in schemes:
    scheme_collection.replace_one({"id": scheme["id"]}, scheme, upsert=True)

print(f"{len(schemes)} schemes imported or updated.")

if "--prune" in sys.argv:
    removed = scheme_collection.delete_many({"id": {"$nin": ids}})
    print(f"{removed.deleted_count} schemes not in schemes.json were deleted.")
