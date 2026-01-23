"""
Strict Search Router
====================
Implements the formal search lifecycle with real-time WebSocket events.
"""

from fastapi import APIRouter, HTTPException
from models.schemas import SearchInput, SearchResponse, SearchStage
from services.hybrid_search import search_scholarships, get_search_status
from services.websocket import broadcast_agent_event
from services.user_memory import get_user_id, log_interaction, get_personalization_boost
from services.web_search import search_web_scholarships
from pydantic import BaseModel
from typing import Dict, List, Optional
import time
import logging
import asyncio

logger = logging.getLogger("mas_scholar_api.search")

router = APIRouter()


class EnrichedScholarshipResult(BaseModel):
    """Full scholarship result with all enrichment data."""
    id: str
    name: str
    provider: str
    amount: int
    deadline: str
    application_link: Optional[str] = None
    match_score: int
    verified: bool
    eligibility_status: str = "unknown"
    category: List[str] = []
    deadline_info: Optional[Dict] = None
    scam_indicators: List[str] = []
    trust_score: float = 0.5
    radar_scores: Dict[str, int] = {}
    is_web_result: bool = False
    source_snippet: Optional[str] = None


class EnrichedSearchResponse(BaseModel):
    """Search response with fully enriched results."""
    results: List[EnrichedScholarshipResult]
    total: int
    latency_ms: float
    search_id: str
    memory_influenced: bool = False  # True if user history affected results


@router.post("/search", response_model=EnrichedSearchResponse)
async def search(input: SearchInput):
    """
    Execute hybrid search with formal lifecycle events.
    Returns fully enriched results with deadline_info, categories, and safety data.
    """
    sid = input.search_id
    start_time = time.time()
    
    # VALIDATION: Empty query check
    if not input.query or not input.query.strip():
        raise HTTPException(
            status_code=400, 
            detail="Query cannot be empty. Please provide a search term."
        )
    
    try:
        # 1. START
        await broadcast_agent_event(sid, SearchStage.START, f"Starting search for: '{input.query}'")
        
        # 2. EMBEDDING
        await broadcast_agent_event(sid, SearchStage.EMBEDDING, "Generating vector embeddings for query...")
        
        # 3. VECTOR SEARCH
        await broadcast_agent_event(sid, SearchStage.VECTOR_SEARCH, "Querying trusted verified database (Qdrant)...")
        
        # Get user ID and personalization boosts from memory
        profile_dict = input.profile.model_dump() if input.profile else {}
        user_id = get_user_id(profile_dict)
        memory_boosts = await get_personalization_boost(user_id, input.query.strip())
        memory_influenced = len(memory_boosts) > 0
        
        if memory_influenced:
            await broadcast_agent_event(sid, SearchStage.SCORING, f"🧠 Memory active: {len(memory_boosts)} scholarships influenced by your history")
        
        # Execute Database Search
        results, _, logs = await search_scholarships(
            query=input.query.strip(),
            profile=profile_dict,
            filters={},
            top_k=input.top_k
        )
        
        # Apply memory boosts (soft influence)
        for r in results:
            rid = r.get("id")
            if rid in memory_boosts:
                boost = memory_boosts[rid]
                r["match_score"] = min(100, int(r.get("match_score", 0) + boost * 100))
                r["memory_boosted"] = True
        
        # 4. WEB SEARCH AGENT - Conditional Fallback
        # Trigger ONLY if local confidence is low (max match_score < 60)
        max_local_score = max([r.get("match_score", 0) for r in results]) if results else 0
        
        web_results = []
        if max_local_score < 60:
            await broadcast_agent_event(sid, SearchStage.VECTOR_SEARCH, "⚠️ Low local confidence. Activating Web Search Agent...")
            web_results = await search_web_scholarships(input.query.strip(), limit=3)
            
            if web_results:
                await broadcast_agent_event(sid, SearchStage.VECTOR_SEARCH, f"🌐 Found {len(web_results)} external web results")
            else:
                await broadcast_agent_event(sid, SearchStage.VECTOR_SEARCH, "🌐 No additional web results found")
        else:
            await broadcast_agent_event(sid, SearchStage.VECTOR_SEARCH, "✅ High-confidence local matches found. Agent skipped.")
        
        # 5. RRF FUSION / SCORING
        await broadcast_agent_event(sid, SearchStage.RRF_FUSION, f"Fusing BM25 and Vector results. Found {len(results)} verified + {len(web_results)} web candidates.")
        await broadcast_agent_event(sid, SearchStage.SCORING, "Calculating eligibility scores...")
        
        # Map VERIFIED results to ENRICHED schema
        final_results = []
        for r in results:
            final_results.append(EnrichedScholarshipResult(
                id=str(r.get("id", "")),
                name=r.get("name", "Unknown"),
                provider=r.get("provider", "Unknown"),
                amount=int(r.get("amount", 0)),
                deadline=r.get("application_deadline") or "Rolling",
                application_link=r.get("application_link"),
                match_score=int(r.get("match_score", 0)),
                verified=bool(r.get("verified", False)),
                eligibility_status=r.get("eligibility_status", "unknown"),
                category=r.get("category", []),
                deadline_info=r.get("deadline_info"),
                scam_indicators=r.get("scam_indicators", []),
                trust_score=float(r.get("trust_score", 0.5)),
                radar_scores=r.get("radar_scores", {}),
                is_web_result=False
            ))
        
        # Append WEB results (marked as external)
        for wr in web_results:
            final_results.append(EnrichedScholarshipResult(
                id=str(wr.get("id", "")),
                name=wr.get("name", "External Scholarship"),
                provider=wr.get("provider", "Web Source"),
                amount=int(wr.get("amount", 0)),
                deadline=wr.get("deadline", "Check source"),
                application_link=wr.get("application_link"),
                match_score=int(wr.get("match_score", 50)),
                verified=False,
                eligibility_status="check_source",
                category=[],
                deadline_info=None,
                scam_indicators=[],
                trust_score=0.3,
                radar_scores={},
                is_web_result=True,
                source_snippet=wr.get("source_snippet", "")
            ))
            
        latency = (time.time() - start_time) * 1000
        
        # 6. COMPLETE
        await broadcast_agent_event(
            sid, 
            SearchStage.COMPLETE, 
            f"Search complete. Returning {len(results)} verified + {len(web_results)} web results.",
            meta={"latency_ms": round(latency, 1), "total": len(final_results), "web_results": len(web_results)}
        )
        
        # Log this search interaction to memory
        if results:
            # Log interaction with top result
            asyncio.create_task(log_interaction(
                user_id=user_id,
                scholarship_id=str(results[0].get("id", "")),
                scholarship_name=results[0].get("name", ""),
                interaction_type="search",
                query=input.query.strip()
            ))
        
        return EnrichedSearchResponse(
            results=final_results,
            total=len(final_results),
            latency_ms=latency,
            search_id=sid,
            memory_influenced=memory_influenced
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Search failed: {e}")
        await broadcast_agent_event(sid, SearchStage.ERROR, f"Search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


class LogInteractionInput(BaseModel):
    """Input for logging user interactions."""
    user_id: str
    scholarship_id: str
    scholarship_name: str
    interaction_type: str = "click"  # click, shortlist


@router.post("/log-interaction")
async def log_user_interaction(input: LogInteractionInput):
    """Log a user interaction (click/shortlist) to memory for personalization."""
    try:
        await log_interaction(
            user_id=input.user_id,
            scholarship_id=input.scholarship_id,
            scholarship_name=input.scholarship_name,
            interaction_type=input.interaction_type,
            query=""
        )
        return {"status": "logged", "type": input.interaction_type}
    except Exception as e:
        logger.error(f"Failed to log interaction: {e}")
        return {"status": "error", "message": str(e)}

