"""
Gemini AI Service
==================
Secure integration with Google Gemini for intelligent document extraction.
Implements rate limiting and input validation for security.
"""

import os
import time
import logging
import hashlib
from typing import Dict, Any, Optional
from collections import defaultdict
from dotenv import load_dotenv

# Load environment variables securely
load_dotenv()

logger = logging.getLogger("mas_scholar_api.gemini")

# Rate limiting storage
_request_counts: Dict[str, list] = defaultdict(list)
_RATE_LIMIT = int(os.getenv("GEMINI_RATE_LIMIT", "10"))  # requests per minute
_RATE_WINDOW = 60  # seconds

# Gemini client (lazy initialization)
_gemini_model = None


def _get_client_id(request_data: str) -> str:
    """Generate anonymous client ID for rate limiting (no PII stored)."""
    return hashlib.sha256(request_data.encode()).hexdigest()[:16]


def _check_rate_limit(client_id: str) -> bool:
    """Check if client has exceeded rate limit."""
    now = time.time()
    # Clean old entries
    _request_counts[client_id] = [t for t in _request_counts[client_id] if now - t < _RATE_WINDOW]
    
    if len(_request_counts[client_id]) >= _RATE_LIMIT:
        logger.warning(f"⚠️ Rate limit exceeded for client {client_id}")
        return False
    
    _request_counts[client_id].append(now)
    return True


def _sanitize_input(text: str, max_length: int = 5000) -> str:
    """Sanitize input text to prevent injection attacks."""
    if not text:
        return ""
    # Truncate to prevent abuse
    text = text[:max_length]
    # Remove potentially harmful characters
    text = text.replace("```", "").replace("${", "").replace("{{", "")
    return text.strip()


def _get_gemini_model():
    """Lazy initialization of Gemini model."""
    global _gemini_model
    
    if _gemini_model is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.error("❌ GEMINI_API_KEY not found in environment")
            return None
        
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            _gemini_model = genai.GenerativeModel("gemini-1.5-flash")
            logger.info("✅ Gemini AI initialized")
        except Exception as e:
            logger.error(f"❌ Gemini initialization failed: {e}")
            return None
    
    return _gemini_model


async def extract_profile_from_text(text: str, client_hint: str = "") -> Dict[str, Any]:
    """
    Use Gemini to intelligently extract profile information from document text.
    Returns structured profile data for auto-fill.
    """
    client_id = _get_client_id(client_hint or text[:100])
    
    # Security: Check rate limit
    if not _check_rate_limit(client_id):
        return {
            "success": False,
            "error": "Rate limit exceeded. Please try again in a minute.",
            "profile": {}
        }
    
    # Security: Sanitize input
    clean_text = _sanitize_input(text)
    if not clean_text:
        return {"success": False, "error": "Empty input", "profile": {}}
    
    model = _get_gemini_model()
    if not model:
        return {"success": False, "error": "AI service unavailable", "profile": {}}
    
    try:
        prompt = f"""Extract student profile information from this document. 
Return ONLY a JSON object with these fields (use null if not found):
- name: Full name of the student
- category: One of [General, OBC, SC, ST, Minority] or null
- state: Indian state name or null
- income: Annual income as integer (in rupees) or null
- education: One of [class_10, class_12, undergraduate, postgraduate, doctorate] or null
- gender: One of [Male, Female, Other] or null

Document text:
{clean_text[:3000]}

Return ONLY valid JSON, no markdown or explanations."""

        response = model.generate_content(prompt)
        result_text = response.text.strip()

        # Parse JSON from response
        import json
        import re

        # Clean response if wrapped in markdown code blocks
        # Handle both ```json and plain ``` formats
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', result_text)
        if json_match:
            result_text = json_match.group(1).strip()
        else:
            # Try to find raw JSON object
            json_obj_match = re.search(r'\{[\s\S]*\}', result_text)
            if json_obj_match:
                result_text = json_obj_match.group(0)

        profile = json.loads(result_text)
        
        # Validate and clean profile
        valid_categories = ["General", "OBC", "SC", "ST", "Minority"]
        valid_education = ["class_10", "class_12", "undergraduate", "postgraduate", "doctorate"]
        
        if profile.get("category") and profile["category"] not in valid_categories:
            profile["category"] = None
        if profile.get("education") and profile["education"] not in valid_education:
            profile["education"] = None
        
        logger.info(f"✅ Gemini extracted {len([v for v in profile.values() if v])} fields")
        
        return {
            "success": True,
            "profile": {k: v for k, v in profile.items() if v is not None},
            "ai_powered": True
        }
        
    except Exception as e:
        logger.error(f"❌ Gemini extraction failed: {e}")
        return {"success": False, "error": str(e), "profile": {}}


async def extract_scholarship_from_poster(image_text: str, client_hint: str = "") -> Dict[str, Any]:
    """
    Use Gemini to understand scholarship poster text and extract search keywords.
    """
    client_id = _get_client_id(client_hint or image_text[:100])
    
    if not _check_rate_limit(client_id):
        return {
            "success": False,
            "error": "Rate limit exceeded",
            "suggestions": ["scholarship", "government scheme"]
        }
    
    clean_text = _sanitize_input(image_text)
    if not clean_text:
        return {"success": False, "suggestions": ["scholarship"]}
    
    model = _get_gemini_model()
    if not model:
        return {"success": False, "suggestions": ["scholarship", "government scheme"]}
    
    try:
        prompt = f"""Analyze this scholarship poster text and extract precise details.
1. Exact Scholarship Name: Identify the full official name.
2. Search Terms: Extract 3-4 specific keywords (e.g., "NRI", "Diaspora", "Ministry of External Affairs") to find this exact scholarship.
3. Target Category: Identify who it is for (e.g., "PIO", "NRI", "Merit").

Text from poster:
{clean_text[:3000]}

Return ONLY a JSON object:
{{
  "scholarship_name": "Exact Name from Poster",
  "search_suggestions": ["Specific Term 1", "Specific Term 2", "Provider Name"],
  "amount": null or integer (max val),
  "deadline": null or "YYYY-MM-DD"
}}"""

        response = model.generate_content(prompt)
        result_text = response.text.strip()

        import json
        import re

        # Clean response if wrapped in markdown code blocks
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', result_text)
        if json_match:
            result_text = json_match.group(1).strip()
        else:
            # Try to find raw JSON object
            json_obj_match = re.search(r'\{[\s\S]*\}', result_text)
            if json_obj_match:
                result_text = json_obj_match.group(0)

        data = json.loads(result_text)
        
        return {
            "success": True,
            "scholarship_name": data.get("scholarship_name"),
            "suggestions": data.get("search_suggestions", ["scholarship"]),
            "amount": data.get("amount"),
            "deadline": data.get("deadline"),
            "ai_powered": True
        }
        
    except Exception as e:
        logger.error(f"❌ Gemini poster analysis failed: {e}")
        return {"success": False, "suggestions": ["scholarship", "government scheme"]}
