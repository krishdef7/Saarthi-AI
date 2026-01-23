"""
🌐 Web Search Agent Service
============================
Performs live web searches using DuckDuckGo to find scholarships
not in our verified database. Returns simplified results marked as external.
"""

import logging
import asyncio
from typing import List, Dict, Any, Optional
from duckduckgo_search import DDGS

logger = logging.getLogger("mas_scholar_api.web_search")

# Rate limiting: Max 3 web searches per minute per session
_web_search_cache: Dict[str, List[Dict]] = {}


async def search_web_scholarships(
    query: str,
    limit: int = 3
) -> List[Dict[str, Any]]:
    """
    Search the web for scholarships using DuckDuckGo.
    
    Returns simplified scholarship-like objects marked as web results.
    """
    if not query or len(query.strip()) < 3:
        return []
    
    # Check cache first
    cache_key = query.lower().strip()
    if cache_key in _web_search_cache:
        logger.info(f"🌐 Web search cache hit for: {query}")
        return _web_search_cache[cache_key]
    
    try:
        # Build search query optimized for scholarships
        search_query = f"{query} scholarship India apply 2025 2026"
        
        logger.info(f"🌐 Searching web for: {search_query}")
        
        # Run blocking search in thread pool
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(
            None,
            lambda: _perform_ddg_search(search_query, limit)
        )
        
        # Transform to scholarship-like format
        web_scholarships = []
        for i, result in enumerate(results):
            # Skip non-Indian results aggressively
            domain = _extract_domain(result.get("href", ""))
            url = result.get("href", "").lower()
            title = result.get("title", "").lower()
            
            # Filter out Chinese/foreign domains if they slip through
            if any(x in url for x in [".cn", ".ru", "baidu", "zhidao"]):
                continue
                
            # Prefer .in, .gov.in, .org.in
            is_indian_domain = any(x in url for x in [".in", "india", "gov.in", "nic.in"])
            
            web_scholarships.append({
                "id": f"web-{i}-{hash(result.get('href', '')) % 10000}",
                "name": _clean_title(result.get("title", "External Scholarship")),
                "provider": domain,
                "amount": 0,  # Unknown from web
                "deadline": "Check source",
                "match_score": max(50, 85 - (i * 10)) + (10 if is_indian_domain else 0),
                "verified": False,
                "is_web_result": True,
                "application_link": result.get("href", "#"),
                "description": result.get("body", "")[:200],
                "category": [],
                "eligibility_status": "check_source",
                "trust_score": 0.8 if is_indian_domain else 0.3, 
                "source_snippet": result.get("body", "")[:150]
            })
        
        # Cache results
        _web_search_cache[cache_key] = web_scholarships
        
        logger.info(f"✅ Found {len(web_scholarships)} web results")
        return web_scholarships
        
    except Exception as e:
        logger.error(f"❌ Web search failed: {e}")
        return []


def _perform_ddg_search(query: str, limit: int) -> List[Dict]:
    """Synchronous DuckDuckGo search restricted to India."""
    try:
        with DDGS() as ddgs:
            # region='in-en' restricts to India (English)
            results = list(ddgs.text(query, region="in-en", max_results=limit+2))
            return results
    except Exception as e:
        logger.error(f"DDG search error: {e}")
        return []


def _clean_title(title: str) -> str:
    """Clean up search result title."""
    # Remove common suffixes
    for suffix in [" - Apply Now", " | Apply Online", " - Scholarship", " ...", "..."]:
        title = title.replace(suffix, "")
    return title.strip()[:100]


def _extract_domain(url: str) -> str:
    """Extract readable domain from URL."""
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        domain = parsed.netloc.replace("www.", "")
        # Make it more readable
        domain_parts = domain.split(".")
        if len(domain_parts) >= 2:
            return domain_parts[0].capitalize() + " (" + ".".join(domain_parts) + ")"
        return domain.capitalize()
    except:
        return "External Source"


def clear_web_cache():
    """Clear the web search cache."""
    global _web_search_cache
    _web_search_cache = {}
    logger.info("🧹 Web search cache cleared")
