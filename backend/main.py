from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.schemas import UserProfile, Scheme, UserRegister, UserLogin
from backend.eligibility import check_eligibility
from backend.crud import (
    get_all_schemes,
    create_scheme,
    update_scheme,
    delete_scheme
)
from backend.auth import register_user, login_user
from backend.database import user_collection


app = FastAPI(
    title="AI Government Scheme Eligibility Assistant",
    version="1.0.0"
)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Home API
@app.get("/")
def home():
    return {
        "message": "Welcome to AI Government Scheme Eligibility Assistant"
    }


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

    result = register_user(user)

    if result is None:
        return {
            "message": "Email already registered"
        }

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

    return {
        "message": "Login successful",
        "user": result
    }