"""
🏆 MAS-SCHOLAR API - Production Backend
========================================
FastAPI backend with hybrid search, eligibility engine, and WebSocket support.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
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

from services.websocket import manager

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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "*"],
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

# Helper to broadcast agent events


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
