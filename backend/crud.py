from backend.database import scheme_collection


# Get all schemes
def get_all_schemes():
    schemes = []

    for scheme in scheme_collection.find():
        scheme["_id"] = str(scheme["_id"])
        schemes.append(scheme)

    return schemes


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