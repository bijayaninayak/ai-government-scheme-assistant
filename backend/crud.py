import re

from backend.database import scheme_collection


# Get all schemes. Optional: q = words to look for in name/description/
# department, sector = exact sector name (for example "Education").
def get_all_schemes(q=None, sector=None):
    query = {}

    if sector:
        query["sector"] = {"$regex": f"^{re.escape(sector)}$", "$options": "i"}

    if q:
        pattern = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [
            {"name": pattern},
            {"description": pattern},
            {"department": pattern},
        ]

    schemes = []

    for scheme in scheme_collection.find(query).sort("id", 1):
        scheme["_id"] = str(scheme["_id"])
        schemes.append(scheme)

    return schemes


# Get one scheme by its integer id (None if it does not exist)
def get_scheme(id):
    scheme = scheme_collection.find_one({"id": int(id)})

    if scheme is None:
        return None

    scheme["_id"] = str(scheme["_id"])
    return scheme


# Create a new scheme
def create_scheme(data):
    result = scheme_collection.insert_one(data)
    return str(result.inserted_id)


# Update a scheme using integer id
def update_scheme(id, data):
    scheme_collection.update_one(
        {"id": int(id)},
        {"$set": data}
    )


# Delete a scheme using integer id
def delete_scheme(id):
    scheme_collection.delete_one(
        {"id": int(id)}
    )
