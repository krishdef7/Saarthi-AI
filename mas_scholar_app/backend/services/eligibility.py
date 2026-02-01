"""
📋 Eligibility Engine
=====================
100-point scoring system with transparent methodology.

SCORING BREAKDOWN:
- Category match: 30 points (highest weight - most restrictive)
- Income eligibility: 25 points (financial barrier)
- State/Domicile: 15 points (regional schemes)
- Gender match: 10 points
- Education level: 10 points
- Source trust: 10 points (verified vs unverified)
"""

import logging
from typing import Dict, List, Tuple, Any
from datetime import date, datetime
from .safety import get_deadline_info

logger = logging.getLogger("mas_scholar_api.eligibility")

def calculate_eligibility_match(scholarship: Dict, profile: Dict) -> Tuple[int, List[Dict], str]:
    """
    Calculate eligibility match score with TRANSPARENT methodology.

    Args:
        scholarship: Scholarship data
        profile: User profile with category, income, state, etc.

    Returns:
        Tuple of (score, detailed_reasons, status)
    """
    score = 0
    reasons = []
    is_expired = False

    # =========================================================================
    # FIELD NORMALIZATION (handle different data formats)
    # =========================================================================
    # Category: "category" or "categories"
    sch_categories_raw = scholarship.get("category") or scholarship.get("categories") or []
    # Normalize "All" to empty list (means all categories eligible)
    if sch_categories_raw == ["All"] or sch_categories_raw == "All":
        sch_categories_raw = []

    # Income: "max_income" or "income_limit"
    max_income = scholarship.get("max_income") or scholarship.get("income_limit")

    # Education: "education_level" or "education_levels"
    sch_education_raw = scholarship.get("education_level") or scholarship.get("education_levels") or []

    # Deadline: "application_deadline" or "deadline"
    deadline_str = scholarship.get("application_deadline") or scholarship.get("deadline")

    # Gender: default to "All" if not specified
    sch_gender = scholarship.get("gender", "All")

    # Trust score: default to 0.8 for verified government sources
    trust_score = scholarship.get("trust_score")
    if trust_score is None:
        # Infer trust from provider type
        provider_type = scholarship.get("scholarship_type", "").lower()
        if "government" in provider_type:
            trust_score = 0.95
        elif scholarship.get("source_url", "").endswith(".gov.in"):
            trust_score = 0.9
        else:
            trust_score = 0.7

    verified = scholarship.get("verified", False)

    # =========================================================================
    # 1. CATEGORY MATCH (30 points)
    # =========================================================================
    user_category = profile.get("category", "General")
    sch_categories = sch_categories_raw if isinstance(sch_categories_raw, list) else [sch_categories_raw]
    
    if not sch_categories or user_category in sch_categories:
        score += 30
        reasons.append({
            "criterion": "Category Match",
            "passed": True,
            "points": 30,
            "max_points": 30,
            "user_value": user_category,
            "required": ", ".join(sch_categories) if sch_categories else "All categories",
            "explanation": f"✓ Your category ({user_category}) matches the eligibility criteria",
            "status": "pass"
        })
    else:
        reasons.append({
            "criterion": "Category Match",
            "passed": False,
            "points": 0,
            "max_points": 30,
            "user_value": user_category,
            "required": ", ".join(sch_categories),
            "explanation": f"✗ This scholarship is specifically for {', '.join(sch_categories)} students",
            "status": "fail"
        })
    
    # =========================================================================
    # 2. INCOME ELIGIBILITY (25 points)
    # =========================================================================
    user_income = profile.get("income", 0)
    # max_income already normalized above
    
    if max_income is None:
        score += 25
        reasons.append({
            "criterion": "Income Eligibility",
            "passed": True,
            "points": 25,
            "max_points": 25,
            "user_value": f"₹{user_income:,}",
            "required": "No limit",
            "explanation": "✓ No income limit for this scholarship",
            "status": "pass"
        })
    elif user_income <= max_income:
        score += 25
        reasons.append({
            "criterion": "Income Eligibility",
            "passed": True,
            "points": 25,
            "max_points": 25,
            "user_value": f"₹{user_income:,}",
            "required": f"≤ ₹{max_income:,}",
            "explanation": f"✓ Your income (₹{user_income:,}) is within the limit of ₹{max_income:,}",
            "status": "pass"
        })
    else:
        # Partial credit if close
        ratio = max_income / user_income if user_income > 0 else 0
        partial_points = int(25 * ratio * 0.5) if ratio > 0.7 else 0
        score += partial_points
        reasons.append({
            "criterion": "Income Eligibility",
            "passed": False,
            "points": partial_points,
            "max_points": 25,
            "user_value": f"₹{user_income:,}",
            "required": f"≤ ₹{max_income:,}",
            "explanation": f"✗ Income exceeds limit by ₹{user_income - max_income:,}",
            "status": "fail" if partial_points == 0 else "partial"
        })
    
    # =========================================================================
    # 3. STATE/DOMICILE (15 points)
    # =========================================================================
    user_state = profile.get("state", "All India")
    sch_states = scholarship.get("states", [])
    
    if not sch_states or user_state in sch_states or user_state == "All India":
        score += 15
        reasons.append({
            "criterion": "State/Domicile",
            "passed": True,
            "points": 15,
            "max_points": 15,
            "user_value": user_state,
            "required": ", ".join(sch_states) if sch_states else "All India",
            "explanation": "✓ You are eligible based on your state/domicile",
            "status": "pass"
        })
    else:
        reasons.append({
            "criterion": "State/Domicile",
            "passed": False,
            "points": 0,
            "max_points": 15,
            "user_value": user_state,
            "required": ", ".join(sch_states),
            "explanation": f"✗ This scholarship is only for residents of {', '.join(sch_states)}",
            "status": "fail"
        })
    
    # =========================================================================
    # 4. GENDER MATCH (10 points)
    # =========================================================================
    user_gender = profile.get("gender", "")
    # sch_gender already normalized at top
    
    if sch_gender == "All" or not user_gender or user_gender == sch_gender:
        score += 10
        reasons.append({
            "criterion": "Gender",
            "passed": True,
            "points": 10,
            "max_points": 10,
            "user_value": user_gender or "Not specified",
            "required": sch_gender,
            "explanation": "✓ You meet the gender requirements",
            "status": "pass"
        })
    else:
        reasons.append({
            "criterion": "Gender",
            "passed": False,
            "points": 0,
            "max_points": 10,
            "user_value": user_gender,
            "required": sch_gender,
            "explanation": f"✗ This scholarship is specifically for {sch_gender} students",
            "status": "fail"
        })
    
    # =========================================================================
    # 5. EDUCATION LEVEL (10 points)
    # =========================================================================
    user_education = profile.get("education", "").lower()
    # Use normalized sch_education_raw from top
    sch_education = [e.lower() for e in sch_education_raw] if sch_education_raw else []
    
    if not sch_education or not user_education:
        score += 10
        reasons.append({
            "criterion": "Education Level",
            "passed": True,
            "points": 10,
            "max_points": 10,
            "user_value": user_education or "Not specified",
            "required": ", ".join(sch_education) if sch_education else "All levels",
            "explanation": "✓ Education level requirement met",
            "status": "pass"
        })
    elif any(user_education in e or e in user_education for e in sch_education):
        score += 10
        reasons.append({
            "criterion": "Education Level",
            "passed": True,
            "points": 10,
            "max_points": 10,
            "user_value": user_education,
            "required": ", ".join(sch_education),
            "explanation": f"✓ Your education level matches the requirements",
            "status": "pass"
        })
    else:
        reasons.append({
            "criterion": "Education Level",
            "passed": False,
            "points": 0,
            "max_points": 10,
            "user_value": user_education,
            "required": ", ".join(sch_education),
            "explanation": f"✗ This scholarship requires {', '.join(sch_education)} level education",
            "status": "fail"
        })
    
    # =========================================================================
    # 6. SOURCE TRUST (10 points)
    # =========================================================================
    # trust_score and verified already normalized at top
    trust_points = int(10 * trust_score)
    score += trust_points
    
    reasons.append({
        "criterion": "Source Trust",
        "passed": trust_score >= 0.7,
        "points": trust_points,
        "max_points": 10,
        "user_value": "Verified ✓" if verified else "Not verified",
        "required": "Trusted source",
        "explanation": f"{'✓' if trust_score >= 0.7 else '⚠️'} Trust score: {int(trust_score * 100)}%",
        "status": "pass" if trust_score >= 0.7 else "partial"
    })
    
    # =========================================================================
    # 7. DEADLINE CHECK (affects status only)
    # =========================================================================
    # deadline_str already normalized at top
    deadline_info = get_deadline_info(deadline_str)
    
    if deadline_info["is_expired"]:
        is_expired = True
        reasons.append({
            "criterion": "Deadline",
            "passed": False,
            "points": 0,
            "max_points": 0,
            "user_value": str(date.today()),
            "required": deadline_str,
            "explanation": f"✗ {deadline_info['display_text']}",
            "status": "fail"
        })
    else:
        reasons.append({
            "criterion": "Deadline",
            "passed": True,
            "points": 0,
            "max_points": 0,
            "user_value": str(date.today()),
            "required": deadline_str,
            "explanation": f"✓ {deadline_info['display_text']}",
            "status": "pass"
        })
    
    # =========================================================================
    # DETERMINE OVERALL STATUS
    # =========================================================================
    # Clamp score to valid range [0, 100]
    score = max(0, min(100, score))

    if is_expired:
        status = "not_eligible"
    elif score >= 85:
        status = "eligible"
    elif score >= 60:
        status = "conditional"
    else:
        status = "not_eligible"

    return score, reasons, status

def compute_radar_scores(reasons: List[Dict]) -> Dict[str, int]:
    """
    Convert eligibility reasons to radar chart data.
    
    Maps criteria to 5 radar dimensions:
    - Category → Category
    - Income → Income
    - State → Location
    - Education → Education
    - Deadline/Trust → Timing
    """
    radar = {
        "Category": 0,
        "Income": 0,
        "Location": 0,
        "Education": 0,
        "Timing": 0
    }
    
    for reason in reasons:
        criterion = reason.get("criterion", "")
        points = reason.get("points", 0)
        max_points = reason.get("max_points", 1)
        
        # Convert to 0-100 scale
        pct = int((points / max_points) * 100) if max_points > 0 else 100
        
        if "Category" in criterion:
            radar["Category"] = pct
        elif "Income" in criterion:
            radar["Income"] = pct
        elif "State" in criterion or "Domicile" in criterion:
            radar["Location"] = pct
        elif "Education" in criterion:
            radar["Education"] = pct
        elif "Trust" in criterion or "Deadline" in criterion:
            radar["Timing"] = max(radar["Timing"], pct)
    
    return radar

def get_missing_documents(scholarship: Dict, profile: Dict) -> List[str]:
    """
    Determine which documents the user likely needs to prepare.
    """
    required = scholarship.get("required_documents", [])
    
    # Map category to likely available documents
    category = profile.get("category", "General")
    likely_has = {"aadhaar", "bank_passbook"}
    
    if category in ["SC", "ST"]:
        likely_has.add("caste_certificate" if category == "SC" else "tribe_certificate")
    
    missing = [doc for doc in required if doc not in likely_has]
    return missing
