"""
📚 Scholarships Router
======================
CRUD endpoints for scholarship data.
"""

from fastapi import APIRouter, HTTPException, Request
from typing import List, Optional

from models.schemas import ScholarshipBase, ScholarshipWithMatch
from services.safety import validate_scholarship

router = APIRouter()

@router.get("/scholarships", response_model=List[ScholarshipBase])
async def list_scholarships(
    request: Request,
    category: Optional[str] = None,
    state: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """
    List all scholarships with optional filtering.
    
    Query params:
    - category: Filter by category (SC, ST, OBC, etc.)
    - state: Filter by state
    - limit: Max results (default 50)
    - offset: Pagination offset
    """
    scholarships = request.app.state.scholarships
    
    # Apply filters
    filtered = []
    for sch in scholarships:
        if category and category != "All":
            if category not in sch.get("category", []):
                continue
        
        if state and state not in ["All India", ""]:
            sch_states = sch.get("states", [])
            if sch_states and state not in sch_states:
                continue
        
        filtered.append(sch)
    
    # Pagination
    total = len(filtered)
    results = filtered[offset:offset + limit]
    
    return results

@router.get("/scholarships/{scholarship_id}")
async def get_scholarship(request: Request, scholarship_id: str):
    """
    Get a single scholarship by ID with full details and safety validation.
    """
    scholarships = request.app.state.scholarships
    
    for sch in scholarships:
        if sch.get("id") == scholarship_id:
            # Enrich with safety info
            safety_info = validate_scholarship(sch)
            return {
                **sch,
                **safety_info
            }
    
    raise HTTPException(status_code=404, detail="Scholarship not found")

@router.get("/scholarships/categories/list")
async def list_categories(request: Request):
    """Get all unique categories."""
    scholarships = request.app.state.scholarships
    categories = set()
    
    for sch in scholarships:
        for cat in sch.get("category", []):
            categories.add(cat)
    
    return sorted(list(categories))

@router.get("/scholarships/states/list")
async def list_states(request: Request):
    """Get all unique states."""
    scholarships = request.app.state.scholarships
    states = set()
    
    for sch in scholarships:
        for state in sch.get("states", []):
            states.add(state)
    
    return sorted(list(states))


@router.get("/statistics")
async def get_statistics(request: Request):
    """
    Get aggregated statistics about all scholarships.
    Used by the Impact Dashboard.
    """
    scholarships = request.app.state.scholarships
    
    total = len(scholarships)
    verified = sum(1 for s in scholarships if s.get("verified", False))
    
    # Calculate total value
    total_value = sum(s.get("amount", 0) for s in scholarships)
    total_value_cr = total_value / 10000000  # Convert to crores
    
    # Category breakdown
    by_category: dict = {}
    for sch in scholarships:
        for cat in sch.get("category", []):
            by_category[cat] = by_category.get(cat, 0) + 1
    
    # Provider type breakdown
    by_provider_type: dict = {}
    for sch in scholarships:
        ptype = sch.get("provider_type", "unknown")
        by_provider_type[ptype] = by_provider_type.get(ptype, 0) + 1
    
    return {
        "total": total,
        "verified": verified,
        "total_value_cr": round(total_value_cr, 2),
        "by_category": by_category,
        "by_provider_type": by_provider_type
    }
