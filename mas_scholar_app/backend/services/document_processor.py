import logging
import json
from typing import Optional, Dict, Any

logger = logging.getLogger("mas_scholar_api.document")

class DocumentProcessor:
    """
    Handles extraction of text and metadata from uploaded documents.
    Supports: .txt, .md, .json
    Future: .pdf, .docx, images (OCR)
    """
    
    @staticmethod
    async def process_file(filename: str, content: bytes, content_type: str) -> Dict[str, Any]:
        """Process file content and return text + metadata."""
        logger.info(f"📄 Processing document: {filename} ({content_type})")
        
        ext = filename.split('.')[-1].lower() if '.' in filename else ""
        text = ""
        metadata = {"filename": filename, "type": content_type}
        
        try:
            # Text based formats
            if ext in ['txt', 'md', 'markdown', 'csv', 'json']:
                # Try multiple encodings for robustness
                text = None
                for encoding in ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252']:
                    try:
                        text = content.decode(encoding)
                        break
                    except UnicodeDecodeError:
                        continue

                if text is None:
                    # Last resort: decode with replacement characters
                    text = content.decode('utf-8', errors='replace')
                    logger.warning(f"⚠️ File {filename} decoded with replacement chars")

                # Special handling for JSON structured data
                if ext == 'json':
                    try:
                        data = json.loads(text)
                        # Flatten json to string if needed or keep structure
                        text = json.dumps(data, indent=2)
                    except:
                        pass
                        
            # PDF Handling (Placeholder for pypdf)
            elif ext == 'pdf':
                try:
                    import io
                    from pypdf import PdfReader
                    
                    pdf_file = io.BytesIO(content)
                    reader = PdfReader(pdf_file)
                    text = ""
                    for page in reader.pages:
                        text += page.extract_text() + "\n"
                    metadata["pages"] = len(reader.pages)
                    logger.info(f"✅ Extracted PDF text: {len(text)} chars")
                except ImportError:
                    text = "[PDF Content - Library 'pypdf' not installed]"
                    logger.warning("⚠️ pypdf not installed, cannot parse PDF")
                except Exception as e:
                    text = f"[Error parsing PDF: {str(e)}]"
                    logger.error(f"❌ PDF parse error: {e}")

            else:
                text = f"[Unsupported file type: {ext}]"
                logger.warning(f"⚠️ Unsupported file type: {ext}")
            
            return {
                "text": text.strip(),
                "metadata": metadata,
                "success": bool(text.strip())
            }
            
        except Exception as e:
            logger.error(f"❌ Document processing failed: {e}")
            return {
                "text": "",
                "metadata": metadata,
                "error": str(e),
                "success": False
            }
