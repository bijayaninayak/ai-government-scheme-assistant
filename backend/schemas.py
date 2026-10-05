from pydantic import BaseModel, EmailStr


class UserProfile(BaseModel):
    age: int
    income: int
    occupation: str
    state: str
    category: str


class Scheme(BaseModel):
    id: int
    name: str
    occupation: str
    min_age: int
    max_age: int
    income_limit: int
    state: str
    category: str
    benefit: str


class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str