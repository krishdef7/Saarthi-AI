"""
🏆 MAS-SCHOLAR API - Production Backend
========================================
FastAPI backend with hybrid search, eligibility engine, and WebSocket support.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
import time


def safe_int(value, default=0):
    """Safely convert value to int, handling strings, floats, None."""
    if value is None:
        return default
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return default
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import json
import logging

from routers import scholarships, search, eligibility, scan
from services.hybrid_search import initialize_search_engine, get_search_status
from services.data_loader import load_scholarships_data
from services.user_memory import initialize_memory_system

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(name)s | %(message)s')
logger = logging.getLogger("mas_scholar_api")

from services.websocket import manager, emit_search_stage

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup."""
    logger.info("🚀 Starting Saarthi AI API...")
    
    # Load scholarship data
    scholarships_data = load_scholarships_data()
    app.state.scholarships = scholarships_data
    logger.info(f"📚 Loaded {len(scholarships_data)} scholarships")
    
    # Initialize search engine
    await initialize_search_engine(scholarships_data)
    logger.info("🔍 Search engine initialized")
    
    # Initialize user interaction memory
    await initialize_memory_system()
    logger.info("🧠 User memory system initialized")
    
    yield
    
    logger.info("👋 Shutting down Saarthi AI API...")

app = FastAPI(
    title="Saarthi AI",
    description="Guide to Scholarship Success - AI-powered hybrid search and eligibility matching",
    version="1.0.0",
    lifespan=lifespan
)

# CORS for frontend
# Note: Cannot use wildcard "*" with allow_credentials=True - browsers reject this
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(scholarships.router, prefix="/api", tags=["Scholarships"])
app.include_router(search.router, prefix="/api", tags=["Search"])
app.include_router(scan.router)
app.include_router(eligibility.router, prefix="/api", tags=["Eligibility"])

@app.get("/")
async def root():
    """API health check."""
    status = get_search_status()
    return {
        "status": "online",
        "name": "MAS-Scholar API",
        "version": "1.0.0",
        "search_engine": status
    }

@app.get("/api/statistics")
async def get_statistics():
    """Get scholarship statistics for dashboard."""
    scholarships = app.state.scholarships
    
    total_value = sum(s.get("amount", 0) for s in scholarships)
    by_category = {}
    by_provider_type = {"government": 0, "csr": 0, "private": 0}
    verified_count = sum(1 for s in scholarships if s.get("verified", False))
    
    for s in scholarships:
        for cat in s.get("category", []):
            by_category[cat] = by_category.get(cat, 0) + 1
        ptype = s.get("provider_type", "other")
        if ptype in by_provider_type:
            by_provider_type[ptype] += 1
    
    return {
        "total": len(scholarships),
        "verified": verified_count,
        "total_value": total_value,
        "total_value_cr": round(total_value / 10000000, 2),
        "by_category": by_category,
        "by_provider_type": by_provider_type
    }

# WebSocket for real-time agent memory stream
# WebSocket for real-time agent memory stream
@app.websocket("/ws/agent")
async def websocket_agent(websocket: WebSocket, search_id: str = "default"):
    """
    WebSocket endpoint for real-time agent memory stream.
    Requires ?search_id=UUID to pair with search requests.
    """
    await manager.connect(websocket, search_id)
    try:
        while True:
            # Keep connection alive, receive any client messages
            data = await websocket.receive_text()
            # Echo back as acknowledgment
            await websocket.send_json({"type": "ack", "data": data})
    except WebSocketDisconnect:
        manager.disconnect(search_id)

# WebSocket endpoint for live search reasoning stream
@app.websocket("/ws/search")
async def websocket_search(websocket: WebSocket):
    """
    WebSocket endpoint for live reasoning streaming during search.

    Accept JSON: {"query": string, "profile": object}
    Emits stage updates as JSON during search pipeline.
    """
    await websocket.accept()

    try:
        # Receive search request
        data = await websocket.receive_json()
        query = data.get("query", "").strip()
        profile = data.get("profile", {})

        if not query:
            await websocket.send_json({
                "stage": "error",
                "message": "Query cannot be empty",
                "progress": 0,
                "timing_ms": 0,
                "data": {}
            })
            await websocket.close()
            return

        # Import services here to avoid circular imports
        from services.hybrid_search import _bm25, vector_search, rrf_fusion, _scholarships, _search_mode
        from services.eligibility import calculate_eligibility_match, compute_radar_scores
        from services.safety import validate_scholarship
        from services.user_memory import get_user_id, get_personalization_boost

        total_start = time.time()

        # Stage 1: Query Understanding
        stage_start = time.time()
        await emit_search_stage(websocket, "query_understanding", 0, {"query": query})
        await asyncio.sleep(0.05)  # Small delay for visual effect
        stage_time = (time.time() - stage_start) * 1000
        await emit_search_stage(websocket, "query_understanding", stage_time, {"query": query, "profile_keys": list(profile.keys())})

        # Stage 2: BM25 Search
        stage_start = time.time()
        bm25_results = await asyncio.to_thread(_bm25.search, query, 50)
        stage_time = (time.time() - stage_start) * 1000
        await emit_search_stage(websocket, "bm25_search", stage_time, {"matches": len(bm25_results)})

        # Stage 3: Vector Search
        stage_start = time.time()
        if _search_mode == "hybrid":
            vector_results = await asyncio.to_thread(vector_search, query, 50)
        else:
            vector_results = []
        stage_time = (time.time() - stage_start) * 1000
        await emit_search_stage(websocket, "vector_search", stage_time, {
            "matches": len(vector_results),
            "mode": _search_mode
        })

        # Stage 4: RRF Fusion
        stage_start = time.time()
        if vector_results:
            fused = rrf_fusion([bm25_results, vector_results])
        else:
            fused = bm25_results
        candidate_ids = [doc_id for doc_id, _ in fused[:40]]
        stage_time = (time.time() - stage_start) * 1000
        await emit_search_stage(websocket, "rrf_fusion", stage_time, {
            "candidates": len(candidate_ids),
            "bm25_count": len(bm25_results),
            "vector_count": len(vector_results)
        })

        # Stage 5: Memory Boost
        stage_start = time.time()
        user_id = get_user_id(profile)
        memory_boosts = await get_personalization_boost(user_id, query)
        stage_time = (time.time() - stage_start) * 1000
        await emit_search_stage(websocket, "memory_boost", stage_time, {
            "boosted_scholarships": len(memory_boosts),
            "user_id": user_id[:8] + "..."  # Truncated for privacy
        })

        # Stage 6: Eligibility Check
        stage_start = time.time()
        id_to_sch = {s.get("id"): s for s in _scholarships}
        candidates = [id_to_sch.get(doc_id) for doc_id in candidate_ids if doc_id in id_to_sch]

        results = []
        for sch in candidates[:20]:  # Limit to top 20
            if not sch:
                continue
            score, reasons, status = calculate_eligibility_match(sch, profile)
            safety_info = validate_scholarship(sch)
            radar_scores = compute_radar_scores(reasons)

            # Apply memory boost
            if sch.get("id") in memory_boosts:
                boost = memory_boosts[sch.get("id")]
                score = min(100, int(score + boost * 100))

            result = {
                **sch,
                "match_score": score,
                "eligibility_status": status,
                "match_reasons": reasons,
                "radar_scores": radar_scores,
                "scam_indicators": safety_info["scam_indicators"],
                "deadline_info": safety_info["deadline_info"],
                "trust_score": safety_info["trust_score"]
            }
            results.append(result)

        # Sort by match score
        results.sort(key=lambda x: x.get("match_score", 0), reverse=True)
        stage_time = (time.time() - stage_start) * 1000
        await emit_search_stage(websocket, "eligibility_check", stage_time, {
            "checked": len(results),
            "eligible": sum(1 for r in results if r.get("eligibility_status") == "eligible")
        })

        # Stage 7: Complete
        total_time = (time.time() - total_start) * 1000

        # Prepare final results (slim version for WebSocket)
        final_results = []
        for r in results[:10]:
            raw_amount = r.get("amount_max") or r.get("amount_min") or r.get("amount") or 0
            final_results.append({
                "id": r.get("id"),
                "name": r.get("name"),
                "provider": r.get("provider"),
                "amount": safe_int(raw_amount),
                "match_score": safe_int(r.get("match_score", 0)),
                "eligibility_status": r.get("eligibility_status"),
                "verified": r.get("verified", False),
                "trust_score": r.get("trust_score", 0.5)
            })

        await emit_search_stage(websocket, "complete", total_time, {
            "total_results": len(final_results),
            "total_latency_ms": round(total_time, 2),
            "results": final_results
        })

        # Keep connection open briefly for client to process
        await asyncio.sleep(0.1)

    except WebSocketDisconnect:
        logger.info("WebSocket /ws/search client disconnected")
    except Exception as e:
        logger.error(f"WebSocket /ws/search error: {e}")
        try:
            await websocket.send_json({
                "stage": "error",
                "message": str(e),
                "progress": 0,
                "timing_ms": 0,
                "data": {}
            })
        except Exception as e:
            logger.debug(f"Failed to send error to WebSocket: {e}")
    finally:
        try:
            await websocket.close()
        except Exception as e:
            logger.debug(f"WebSocket close failed: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
