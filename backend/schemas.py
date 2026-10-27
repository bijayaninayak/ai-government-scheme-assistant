from pydantic import BaseModel, EmailStr, Field


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
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str