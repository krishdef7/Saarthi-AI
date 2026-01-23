"""
Eligibility & Explainability Router
===================================
Handles detailed scoring and XAI breakdowns separate from search.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from models.schemas import UserProfile
from services.eligibility import calculate_eligibility_match, compute_radar_scores
import logging

logger = logging.getLogger("mas_scholar_api.eligibility")

router = APIRouter()

class EligibilityRequest(BaseModel):
    profile: UserProfile
    scholarship_id: str

class EligibilityResponse(BaseModel):
    scholarship_id: str
    is_eligible: bool
    match_score: int
    radar_chart: dict  # {category: 100, income: 50...}
    breakdown: list     # List of reasons strings
    missing_docs: list  # ["Income Certificate", "Caste Certificate"]

@router.post("/eligibility", response_model=EligibilityResponse)
async def check_eligibility(request: Request, body: EligibilityRequest):
    """
    Calculate detailed eligibility score and explanation.
    """
    try:
        # 1. Fetch Scholarship
        scholarships = request.app.state.scholarships
        scholarship = next((s for s in scholarships if s.get("id") == body.scholarship_id), None)
        
        if not scholarship:
            raise HTTPException(status_code=404, detail=f"Scholarship '{body.scholarship_id}' not found")
            
        # 2. Calculate Match
        score, reasons, status = calculate_eligibility_match(
            scholarship, 
            body.profile.model_dump()
        )
        
        # 3. Compute Radar Data
        radar_data = compute_radar_scores(reasons)
        
        # 4. Determine Missing Docs (Mock logic based on gaps)
        missing = []
        reasons_str = str(reasons).lower()
        if "income" in reasons_str and "fail" in reasons_str:
            missing.append("Valid Income Certificate")
        if body.profile.category.value not in ["General", "All"]:
            missing.append("Caste Certificate/Affidavit")
        if "education" in reasons_str and "fail" in reasons_str:
            missing.append("Education Certificates")
            
        return EligibilityResponse(
            scholarship_id=body.scholarship_id,
            is_eligible=(status == "eligible"),
            match_score=score,
            radar_chart=radar_data,
            breakdown=reasons,
            missing_docs=missing
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Eligibility check failed: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to calculate eligibility: {str(e)}"
        )

