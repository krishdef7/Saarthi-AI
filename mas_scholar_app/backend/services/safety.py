"""
🛡️ Safety Service - Scam Detection & Deadline Parsing
======================================================
Detects scam indicators and parses deadlines for urgency display.
"""

import re
import logging
from datetime import datetime, date
from typing import List, Dict, Tuple, Optional

logger = logging.getLogger("mas_scholar_api.safety")

# Scam detection patterns (23 patterns)
SCAM_PATTERNS = [
    "guaranteed selection",
    "100% success",
    "pay now",
    "processing fee required",
    "bank details for verification",
    "whatsapp only contact",
    "personal pan/aadhaar share",
    "urgent apply now",
    "limited seats",
    "act fast",
    "confirm your slot",
    "registration fee",
    "admission guaranteed",
    "no documents required",
    "instant approval",
    "wire transfer",
    "western union",
    "lottery winner",
    "selected randomly",
    "claim your prize",
    "send money",
    "upfront payment",
    "confidential opportunity"
]

def detect_scam_indicators(text: str) -> List[str]:
    """
    Detect potential scam indicators in scholarship text.
    
    Args:
        text: Text to analyze (description, name, etc.)
    
    Returns:
        List of detected scam patterns
    """
    if not text:
        return []
    
    text_lower = text.lower()
    detected = []
    
    for pattern in SCAM_PATTERNS:
        if pattern in text_lower:
            detected.append(pattern)
    
    return detected

def calculate_trust_score(scholarship: Dict) -> float:
    """
    Calculate trust score based on multiple factors.
    
    Factors:
    - Provider type (government = high trust)
    - Verified status
    - Data source reliability
    - Scam indicators (negative)
    - Presence of official URLs
    """
    score = 0.5  # Start neutral
    
    # Provider type bonus
    provider_type = scholarship.get("provider_type", "").lower()
    if provider_type == "government":
        score += 0.3
    elif provider_type == "csr":
        score += 0.2
    
    # Verified bonus
    if scholarship.get("verified", False):
        score += 0.15
    
    # Official URL bonus
    if scholarship.get("official_notification_url"):
        score += 0.05
    if scholarship.get("portal_url") and "gov.in" in scholarship.get("portal_url", ""):
        score += 0.05
    
    # Scam penalty
    text = f"{scholarship.get('name', '')} {scholarship.get('description', '')}"
    scam_indicators = detect_scam_indicators(text)
    score -= len(scam_indicators) * 0.1
    
    # Clamp to [0, 1]
    return max(0.0, min(1.0, score))

def parse_deadline(deadline_str: Optional[str]) -> Tuple[bool, int, str]:
    """
    Parse deadline string and calculate days remaining.
    
    Args:
        deadline_str: Date string in YYYY-MM-DD format
    
    Returns:
        Tuple of (is_expired, days_remaining, display_text)
    """
    if not deadline_str:
        return False, 999, "No deadline specified"
    
    try:
        deadline = datetime.strptime(deadline_str, "%Y-%m-%d").date()
        today = date.today()
        delta = (deadline - today).days
        
        if delta < 0:
            return True, delta, f"Expired {abs(delta)} days ago"
        elif delta == 0:
            return False, 0, "⚠️ Deadline TODAY!"
        elif delta <= 7:
            return False, delta, f"🔴 {delta} days left - URGENT!"
        elif delta <= 30:
            return False, delta, f"🟡 {delta} days remaining"
        else:
            return False, delta, f"🟢 {delta} days remaining"
            
    except ValueError:
        return False, 999, f"Deadline: {deadline_str}"

def get_deadline_info(deadline_str: Optional[str]) -> Dict:
    """
    Get full deadline information as a dictionary.
    
    Returns:
        Dict with is_expired, days_remaining, display_text, urgency_level
    """
    is_expired, days_remaining, display_text = parse_deadline(deadline_str)
    
    if is_expired:
        urgency = "expired"
    elif days_remaining <= 7:
        urgency = "critical"
    elif days_remaining <= 30:
        urgency = "warning"
    else:
        urgency = "normal"
    
    return {
        "deadline": deadline_str,
        "is_expired": is_expired,
        "days_remaining": days_remaining,
        "display_text": display_text,
        "urgency_level": urgency
    }

def validate_scholarship(scholarship: Dict) -> Dict:
    """
    Validate and enrich scholarship with safety information.
    
    Returns:
        Dict with trust_score, scam_indicators, deadline_info, is_safe
    """
    text = f"{scholarship.get('name', '')} {scholarship.get('description', '')}"
    scam_indicators = detect_scam_indicators(text)
    trust_score = calculate_trust_score(scholarship)
    deadline_info = get_deadline_info(scholarship.get("application_deadline"))
    
    is_safe = len(scam_indicators) == 0 and trust_score >= 0.5
    
    return {
        "trust_score": round(trust_score, 2),
        "scam_indicators": scam_indicators,
        "deadline_info": deadline_info,
        "is_safe": is_safe,
        "warnings": [
            f"⚠️ Detected suspicious pattern: '{indicator}'" 
            for indicator in scam_indicators
        ]
    }
