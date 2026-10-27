import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from backend.schemas import UserProfile, Scheme, UserRegister, UserLogin
from backend.eligibility import check_eligibility
from backend.crud import (
    get_all_schemes,
    create_scheme,
    update_scheme,
    delete_scheme
)
from backend.auth import (
    register_user,
    login_user,
    ensure_indexes,
    create_access_token,
    get_user_from_token,
    PasswordTooLongError,
)
from backend.database import user_collection, client


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs once when the server starts. A database problem here should not
    # stop the server; /health/db will report it instead.
    try:
        ensure_indexes()
    except Exception as error:
        print(f"Warning: could not create database indexes: {error}")
    yield


app = FastAPI(
    title="AI Government Scheme Eligibility Assistant",
    version="1.0.0",
    lifespan=lifespan
)


# CORS: which websites may call this backend.
# Override with CORS_ORIGINS in .env (comma separated) when you deploy.
DEFAULT_ORIGINS = (
    "http://localhost:3000,http://127.0.0.1:3000,"
    "http://localhost:5173,http://127.0.0.1:5173,"
    "http://localhost:8443,http://127.0.0.1:8443"
)
allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", DEFAULT_ORIGINS).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


bearer_scheme = HTTPBearer(auto_error=False)


# Dependency for private routes: requires "Authorization: Bearer <token>"
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        user = get_user_from_token(credentials.credentials)
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error))

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    return user


# Home API
@app.get("/")
def home():
    return {
        "message": "Welcome to AI Government Scheme Eligibility Assistant"
    }


# Health check: is the server running?
@app.get("/health")
def health():
    return {"status": "ok"}


# Health check: can the server reach MongoDB?
@app.get("/health/db")
def health_db():
    try:
        client.admin.command("ping")
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Cannot connect to the database"
        )
    return {"status": "ok", "database": "connected"}


# Current logged-in user (private route)
@app.get("/me")
def me(current_user: dict = Depends(get_current_user)):
    return current_user


# Check Eligibility
@app.post("/check-eligibility")
def check(user: UserProfile):
    schemes = check_eligibility(user)

    return {
        "total_schemes": len(schemes),
        "eligible_schemes": schemes
    }


# Get All Schemes
@app.get("/schemes")
def all_schemes():
    return get_all_schemes()


# Create Scheme
@app.post("/schemes")
def add_scheme(scheme: Scheme):
    new_id = create_scheme(scheme.model_dump())

    return {
        "message": "Scheme added successfully",
        "id": new_id
    }


# Update Scheme
@app.put("/schemes/{scheme_id}")
def edit_scheme(scheme_id: int, scheme: Scheme):
    update_scheme(
        scheme_id,
        scheme.model_dump()
    )

    return {
        "message": "Scheme updated successfully"
    }


# Delete Scheme
@app.delete("/schemes/{scheme_id}")
def remove_scheme(scheme_id: int):
    delete_scheme(scheme_id)

    return {
        "message": "Scheme deleted successfully"
    }


# Register User
@app.post("/register")
def register(user: UserRegister):

    try:
        result = register_user(user)
    except PasswordTooLongError:
        return JSONResponse(
            status_code=400,
            content={
                "message": "Password is too long (max 72 bytes)",
                "detail": "Password is too long (max 72 bytes)"
            }
        )

    if result is None:
        # "message" is kept because the current register page reads it.
        return JSONResponse(
            status_code=409,
            content={
                "message": "Email already registered",
                "detail": "Email already registered"
            }
        )

    return {
        "message": "User registered successfully",
        "user_id": result
    }


# Login User
@app.post("/login")
def login(user: UserLogin):

    result = login_user(
        user.email,
        user.password
    )

    if result is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    try:
        token = create_access_token(result["id"])
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error))

    return {
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer",
        "user": result
    }