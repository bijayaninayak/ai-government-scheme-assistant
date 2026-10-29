import os
from contextlib import asynccontextmanager

from fastapi import BackgroundTasks, FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from backend.schemas import (
    UserProfile,
    Scheme,
    UserRegister,
    UserLogin,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from backend.eligibility import check_eligibility_full
from pymongo.errors import DuplicateKeyError

from backend.crud import (
    get_all_schemes,
    get_scheme,
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
    create_password_reset,
    reset_password,
    PasswordTooLongError,
)
from backend.email_sender import send_reset_email
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


# Dependency for admin-only routes. Admins are the emails listed in
# ADMIN_EMAILS in the .env file (comma separated). If it is empty,
# nobody is an admin and the scheme edit routes stay locked.
def get_current_admin(current_user: dict = Depends(get_current_user)):
    admin_emails = {
        email.strip().lower()
        for email in os.getenv("ADMIN_EMAILS", "").split(",")
        if email.strip()
    }

    if current_user["email"].lower() not in admin_emails:
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return current_user


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
    schemes, not_eligible = check_eligibility_full(user)

    return {
        "total_schemes": len(schemes),
        "eligible_schemes": schemes,
        # Schemes that do not match, each with the reasons why
        "not_eligible_schemes": not_eligible
    }


# Get All Schemes (optional ?q=words and ?sector=Education)
@app.get("/schemes")
def all_schemes(q: str | None = None, sector: str | None = None):
    return get_all_schemes(q=q, sector=sector)


# Get one scheme
@app.get("/schemes/{scheme_id}")
def one_scheme(scheme_id: int):
    scheme = get_scheme(scheme_id)

    if scheme is None:
        raise HTTPException(status_code=404, detail="Scheme not found")

    return scheme


# Create Scheme (admin only)
@app.post("/schemes")
def add_scheme(
    scheme: Scheme,
    admin: dict = Depends(get_current_admin)
):
    try:
        new_id = create_scheme(scheme.model_dump())
    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail="A scheme with this id already exists"
        )

    return {
        "message": "Scheme added successfully",
        "id": new_id
    }


# Update Scheme (admin only)
@app.put("/schemes/{scheme_id}")
def edit_scheme(
    scheme_id: int,
    scheme: Scheme,
    admin: dict = Depends(get_current_admin)
):
    update_scheme(
        scheme_id,
        scheme.model_dump()
    )

    return {
        "message": "Scheme updated successfully"
    }


# Delete Scheme (admin only)
@app.delete("/schemes/{scheme_id}")
def remove_scheme(
    scheme_id: int,
    admin: dict = Depends(get_current_admin)
):
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


# Forgot password: always gives the same answer, whether or not the email
# has an account, so nobody can use this to find out who is registered.
@app.post("/forgot-password")
def forgot_password(
    request: ForgotPasswordRequest,
    background_tasks: BackgroundTasks
):
    created = create_password_reset(request.email)

    if created is not None:
        name, email, token = created
        # Sent after the answer, so the response time looks the same too.
        background_tasks.add_task(send_reset_email, email, name, token)

    return {
        "message": "If an account exists for that email, we have sent a link to reset the password."
    }


# Reset password with the one-time token from the email
@app.post("/reset-password")
def reset_password_route(request: ResetPasswordRequest):
    try:
        done = reset_password(request.token, request.password)
    except PasswordTooLongError:
        raise HTTPException(
            status_code=400,
            detail="Password is too long (max 72 bytes)"
        )

    if not done:
        raise HTTPException(
            status_code=400,
            detail="This reset link is invalid or has expired. Please request a new one."
        )

    return {"message": "Password updated. You can now log in."}
