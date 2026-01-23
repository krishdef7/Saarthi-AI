"""
Strict Pydantic Models for API Contracts.
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from uuid import UUID
from datetime import datetime
from .enums import Category, EducationLevel, SearchStage

class UserProfile(BaseModel):
    category: Category = Field(default=Category.GENERAL)
    state: str = Field(default="All India")
    income: int = Field(default=500000, description="Annual family income")
    education: EducationLevel = Field(default=EducationLevel.UNDERGRADUATE)
    gender: str = Field(default="Any")

class SearchInput(BaseModel):
    search_id: str = Field(..., description="Client-generated UUID for WebSocket pairing")
    query: str
    profile: Optional[UserProfile] = None
    top_k: int = Field(default=10, le=50)

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
