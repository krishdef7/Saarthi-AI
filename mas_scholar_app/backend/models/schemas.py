"""
Strict Pydantic Models for API Contracts.
"""
from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Optional
from uuid import UUID
from datetime import datetime
import re
from .enums import Category, EducationLevel, SearchStage

# Valid Indian states for validation
VALID_STATES = {
    "All India", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
    "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
    "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
    "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi",
    "Jammu and Kashmir", "Ladakh", "Chandigarh", "Puducherry",
    "Andaman and Nicobar Islands", "Dadra and Nagar Haveli",
    "Daman and Diu", "Lakshadweep"
}


class UserProfile(BaseModel):
    category: Category = Field(default=Category.GENERAL)
    state: str = Field(default="All India")
    income: int = Field(default=500000, ge=0, le=100000000, description="Annual family income")
    education: EducationLevel = Field(default=EducationLevel.UNDERGRADUATE)
    gender: str = Field(default="Any")

    @field_validator("state")
    @classmethod
    def validate_state(cls, v: str) -> str:
        if v and v not in VALID_STATES:
            # Accept unknown states but normalize
            return v.strip().title() if v.strip() else "All India"
        return v

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: str) -> str:
        valid_genders = {"Any", "Male", "Female", "Other"}
        if v not in valid_genders:
            return "Any"
        return v


class SearchInput(BaseModel):
    search_id: str = Field(..., min_length=1, max_length=100, description="Client-generated UUID for WebSocket pairing")
    query: str = Field(..., min_length=1, max_length=500)
    profile: Optional[UserProfile] = None
    top_k: int = Field(default=10, ge=1, le=50)

    @field_validator("search_id")
    @classmethod
    def validate_search_id(cls, v: str) -> str:
        # Allow UUID format or simple alphanumeric IDs
        v = v.strip()
        if not v:
            raise ValueError("search_id cannot be empty")
        if not re.match(r'^[a-zA-Z0-9\-_]+$', v):
            raise ValueError("search_id must be alphanumeric with hyphens/underscores only")
        return v

    @field_validator("query")
    @classmethod
    def validate_query(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Query cannot be empty")
        if len(v) > 500:
            raise ValueError("Query too long (max 500 characters)")
        return v

class WSEvent(BaseModel):
    """
    Strict shape for WebSocket memory stream events.
    """
    search_id: str
    stage: SearchStage
    message: str
    timestamp: datetime = Field(default_factory=datetime.now)
    meta: Optional[Dict] = None

class ScholarshipResult(BaseModel):
    """
    Canonical scholarship result for search lists.
    """
    id: str
    name: str
    provider: str
    amount: int
    deadline: str
    match_score: int
    verified: bool
    application_link: Optional[str] = None
    # Explanation is a summary of point contributions
    explanation: Dict[str, int]  # e.g., {"income": 25, "category": 30}
    
class SearchResponse(BaseModel):
    results: List[ScholarshipResult]
    total: int
    latency_ms: float
    search_id: str


class ScholarshipBase(BaseModel):
    """Base scholarship data for list endpoints."""
    id: str
    name: str
    provider: str
    provider_type: Optional[str] = None
    amount: int = 0
    category: List[str] = []
    states: List[str] = []
    gender: str = "All"
    education_level: List[str] = []
    max_income: Optional[int] = None
    application_deadline: Optional[str] = None
    application_link: Optional[str] = None
    description: Optional[str] = None
    verified: bool = False
    trust_score: float = 0.5
    
    class Config:
        extra = "allow"


class ScholarshipWithMatch(ScholarshipBase):
    """Scholarship with eligibility match data."""
    match_score: int = 0
    eligibility_status: str = "unknown"
    match_reasons: List[Dict] = []
    radar_scores: Dict[str, int] = {}
    scam_indicators: List[str] = []
    deadline_info: Optional[Dict] = None
