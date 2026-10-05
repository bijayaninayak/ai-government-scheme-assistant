from backend.database import user_collection


def register_user(user):
    existing_user = user_collection.find_one({
        "email": user.email
    })

    if existing_user:
        return None

    user_data = {
        "name": user.name,
        "email": user.email,
        "password": user.password
    }

    result = user_collection.insert_one(user_data)

    return str(result.inserted_id)
def login_user(email, password):
    user = user_collection.find_one({
        "email": email
    })

    if user is None:
        return None

    if user["password"] != password:
        return None

    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"]
    }