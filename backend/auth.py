import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from bson import ObjectId
from bson.errors import InvalidId
from pymongo.errors import DuplicateKeyError

from backend.database import user_collection

JWT_ALGORITHM = "HS256"
TOKEN_LIFETIME_MINUTES = 60 * 8  # a login stays valid for 8 hours

# bcrypt only looks at the first 72 bytes of a password.
MAX_PASSWORD_BYTES = 72


class PasswordTooLongError(ValueError):
    pass


def _password_bytes(password):
    data = password.encode("utf-8")
    if len(data) > MAX_PASSWORD_BYTES:
        raise PasswordTooLongError("Password is too long")
    return data


def ensure_indexes():
    # Makes MongoDB itself refuse two users with the same email.
    user_collection.create_index("email", unique=True)


def register_user(user):
    email = user.email.lower()

    if user_collection.find_one({"email": email}):
        return None

    password_hash = bcrypt.hashpw(
        _password_bytes(user.password),
        bcrypt.gensalt()
    ).decode("utf-8")

    user_data = {
        "name": user.name,
        "email": email,
        "password_hash": password_hash
    }

    try:
        result = user_collection.insert_one(user_data)
    except DuplicateKeyError:
        return None

    return str(result.inserted_id)


def login_user(email, password):
    user = user_collection.find_one({
        "email": email.lower()
    })

    if user is None:
        return None

    # Old accounts created before hashing have no password_hash.
    # They cannot log in and must be re-registered.
    stored_hash = user.get("password_hash")
    if not stored_hash:
        return None

    try:
        password_ok = bcrypt.checkpw(
            _password_bytes(password),
            stored_hash.encode("utf-8")
        )
    except (PasswordTooLongError, ValueError):
        return None

    if not password_ok:
        return None

    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"]
    }


def _jwt_secret():
    secret = os.getenv("JWT_SECRET")
    if not secret:
        raise RuntimeError("JWT_SECRET is not set in the .env file")
    return secret


def create_access_token(user_id):
    expires = datetime.now(timezone.utc) + timedelta(
        minutes=TOKEN_LIFETIME_MINUTES
    )
    return jwt.encode(
        {"sub": user_id, "exp": expires},
        _jwt_secret(),
        algorithm=JWT_ALGORITHM
    )


def get_user_from_token(token):
    """Return the public user dict for a valid token, otherwise None."""
    try:
        payload = jwt.decode(
            token,
            _jwt_secret(),
            algorithms=[JWT_ALGORITHM]
        )
        user = user_collection.find_one({"_id": ObjectId(payload["sub"])})
    except (jwt.PyJWTError, InvalidId, KeyError):
        return None

    if user is None:
        return None

    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"]
    }
