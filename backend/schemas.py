from typing import Dict, List, Literal, Optional, Union

from pydantic import BaseModel, EmailStr, Field


class UserProfile(BaseModel):
    age: int = Field(ge=0, le=120)
    income: int = Field(ge=0)
    occupation: str = Field(min_length=1)
    state: str = Field(min_length=1)
    category: str = Field(min_length=1)
    # Optional answers. Leaving them out means "prefer not to say": the tool
    # then asks the user to confirm those rules themselves.
    gender: Optional[Literal["Female", "Male", "Other"]] = None
    area: Optional[Literal["Rural", "Urban"]] = None
    disability: Optional[bool] = None
    bpl: Optional[bool] = None
    # "Do you have a daughter under 10 years of age?"
    girl_child: Optional[bool] = None


# occupation, state and category may be one text ("All", "Farmer") or a list
# (["OBC", "EBC"]). Old records that use a single text keep working.
# min_age, max_age and income_limit are empty (null) when the scheme states
# no such limit.
class Scheme(BaseModel):
    id: int
    name: str
    occupation: Union[str, List[str]]
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    income_limit: Optional[int] = None
    state: Union[str, List[str]]
    category: Union[str, List[str]]
    # New optional rules. "All" / False means the scheme has no such rule.
    gender: Union[str, List[str]] = "All"
    area: Union[str, List[str]] = "All"
    disability_required: bool = False
    bpl_required: bool = False
    # For schemes meant for "A or B" (for example SC/ST or women): a list of
    # groups. The user matches if they fit ALL the conditions of ANY one group.
    # Each group may use: category, gender, occupation, area, state.
    any_of: List[Dict[str, Union[str, List[str]]]] = []
    # Set to 10 for a scheme meant for a girl child under 10 (opened by a parent)
    girl_child_under_age: Optional[int] = None
    benefit: str
    department: str = ""
    level: str = ""
    sector: str = ""
    description: str = ""
    eligibility_criteria: List[str] = []
    other_requirements: List[str] = []
    documents: List[str] = []
    how_to_apply: List[str] = []
    notes: List[str] = []
    official_url: str = ""
    source_url: str = ""
    source_name: str = ""
    last_verified: str = ""


class UserRegister(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=8)
