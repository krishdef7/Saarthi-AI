"""
Scan Router - Multimodal Document Processing
=============================================
Handles document and poster uploads with Gemini AI-powered extraction.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
import logging
from typing import Dict

from services.document_processor import DocumentProcessor
from services.gemini_service import extract_profile_from_text, extract_scholarship_from_poster

router = APIRouter(prefix="/api/scan", tags=["multimodal"])
logger = logging.getLogger("mas_scholar_api.scan")


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Multimodal Endpoint: Accept document (PDF/Text), extract context using Gemini AI,
    and return structured data for profile auto-fill.
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    try:
        content = await file.read()
        result = await DocumentProcessor.process_file(file.filename, content, file.content_type)
        
        if not result["success"]:
            return {"status": "error", "message": "Could not extract text", "details": result.get("error")}
        
        text = result["text"]
        
        # Use Gemini AI for intelligent extraction
        ai_result = await extract_profile_from_text(text, client_hint=file.filename)
        
        if ai_result["success"]:
            return {
                "status": "success",
                "filename": file.filename,
                "extracted_text_snippet": text[:300] + "..." if len(text) > 300 else text,
                "suggested_profile": ai_result["profile"],
                "full_text_length": len(text),
                "fields_extracted": len(ai_result["profile"]),
                "ai_powered": True
            }
        else:
            # Fallback to regex-based extraction
            import re
            extracted_profile = {}
            text_lower = text.lower()
            
            # Name extraction
            for pattern in [r"name[:\s]+([A-Za-z\s]+)", r"i am ([A-Za-z\s]+)"]:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    extracted_profile["name"] = match.group(1).strip()[:50]
                    break
            
            # Category detection
            if any(kw in text_lower for kw in ["sc", "scheduled caste"]):
                extracted_profile["category"] = "SC"
            elif any(kw in text_lower for kw in ["st", "scheduled tribe"]):
                extracted_profile["category"] = "ST"
            elif any(kw in text_lower for kw in ["obc", "other backward"]):
                extracted_profile["category"] = "OBC"
            elif "minority" in text_lower:
                extracted_profile["category"] = "Minority"
            
            return {
                "status": "success",
                "filename": file.filename,
                "extracted_text_snippet": text[:300] + "...",
                "suggested_profile": extracted_profile,
                "full_text_length": len(text),
                "fields_extracted": len(extracted_profile),
                "ai_powered": False,
                "fallback_reason": ai_result.get("error", "AI unavailable")
            }
        
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/poster")
async def upload_poster(file: UploadFile = File(...)):
    """
    Multimodal Endpoint: Accept scholarship poster image, extract text via OCR,
    use Gemini AI to understand content, and return search suggestions.
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    # Check if it's an image
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image (PNG, JPG, etc.)")
    
    try:
        content = await file.read()
        extracted_text = ""
        ocr_method = "none"
        
        # Try OCR extraction
        try:
            import io
            from PIL import Image
            import pytesseract
            
            image = Image.open(io.BytesIO(content))
            extracted_text = pytesseract.image_to_string(image)
            ocr_method = "pytesseract"
            logger.info(f"📸 Extracted {len(extracted_text)} chars from poster via OCR")
        except ImportError:
            ocr_method = "unavailable"
            logger.warning("⚠️ pytesseract not installed")
        except Exception as e:
            logger.error(f"❌ OCR failed: {e}")
        
        # Use Gemini AI to analyze the extracted text
        if extracted_text:
            ai_result = await extract_scholarship_from_poster(extracted_text, client_hint=file.filename)
            
            return {
                "status": "success",
                "filename": file.filename,
                "ocr_method": ocr_method,
                "extracted_text_length": len(extracted_text),
                "extracted_text_snippet": extracted_text[:500] if extracted_text else "",
                "scholarship_name": ai_result.get("scholarship_name"),
                "search_suggestions": ai_result.get("suggestions", ["scholarship"]),
                "amount": ai_result.get("amount"),
                "deadline": ai_result.get("deadline"),
                "ai_powered": ai_result.get("ai_powered", False),
                "message": "AI analyzed your poster and found matching search terms"
            }
        else:
            return {
                "status": "partial",
                "filename": file.filename,
                "ocr_method": ocr_method,
                "extracted_text_length": 0,
                "search_suggestions": ["scholarship", "government scheme"],
                "message": "OCR not available. Install pytesseract for image text extraction."
            }
        
    except Exception as e:
        logger.error(f"Poster upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
