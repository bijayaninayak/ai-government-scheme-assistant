import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from bson import ObjectId
from bson.errors import InvalidId
from pymongo.errors import DuplicateKeyError

from backend.database import user_collection

JWT_ALGORITHM = "HS256"
TOKEN_LIFETIME_MINUTES = 60 * 8  # a login stays valid for 8 hours

RESET_LIFETIME_MINUTES = 30  # a reset link works for 30 minutes
RESET_COOLDOWN_SECONDS = 60  # at most one reset email per account per minute

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
    user_collection.create_index("reset_token_hash", sparse=True)


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
    # "pwv" is the account's password version. A password reset raises it, so
    # every login made before the reset stops working (no clocks involved).
    try:
        user = user_collection.find_one({"_id": ObjectId(user_id)})
    except InvalidId:
        user = None
    version = (user or {}).get("password_version", 0)
    return jwt.encode(
        {"sub": user_id, "exp": expires, "pwv": version},
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

    # A login made before the last password reset is no longer valid.
    if payload.get("pwv", 0) != user.get("password_version", 0):
        return None

    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"]
    }


# ---------------------------------------------------------------------------
# Forgot / reset password
# ---------------------------------------------------------------------------

def _hash_token(token):
    # Only this hash is stored. A copy of the database cannot be used to
    # reset anyone's password.
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_password_reset(email):
    """Makes a one-time reset token for this email.

    Returns (name, email, token), or None when there is no such account or a
    reset was already requested in the last minute. The caller must answer
    the same way either way, so nobody can find out which emails exist.
    """
    user = user_collection.find_one({"email": email.lower()})
    if user is None:
        return None

    now = datetime.now(timezone.utc)
    last = user.get("reset_requested_at")
    if last is not None:
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        if (now - last).total_seconds() < RESET_COOLDOWN_SECONDS:
            return None

    token = secrets.token_urlsafe(32)
    user_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "reset_token_hash": _hash_token(token),
            "reset_expires": now + timedelta(minutes=RESET_LIFETIME_MINUTES),
            "reset_requested_at": now,
        }}
    )
    return user["name"], user["email"], token


def reset_password(token, new_password):
    """Sets a new password if the token is valid, unused and not expired.

    Returns True on success, False if the link is invalid or expired.
    Raises PasswordTooLongError (before the token is used up) for a bad password.
    """
    new_hash = bcrypt.hashpw(
        _password_bytes(new_password),
        bcrypt.gensalt()
    ).decode("utf-8")

    now = datetime.now(timezone.utc)

    # One atomic step: find the matching unused token AND change the password,
    # so the same link can never be used twice.
    result = user_collection.find_one_and_update(
        {
            "reset_token_hash": _hash_token(token),
            "reset_expires": {"$gt": now},
        },
        {
            "$set": {"password_hash": new_hash, "password_changed_at": now},
            "$inc": {"password_version": 1},  # ends every older login
            "$unset": {
                "reset_token_hash": "",
                "reset_expires": "",
                "reset_requested_at": "",
                "password": "",  # an old plaintext password, if there was one
            },
        },
    )
    return result is not None
