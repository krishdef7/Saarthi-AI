"""
User Interaction Memory Service
================================
Stores and retrieves user interactions in Qdrant for personalized retrieval.
Implements "Memory Beyond a Single Prompt" requirement.
"""

import logging
import hashlib
from datetime import datetime
from typing import List, Dict, Optional

logger = logging.getLogger("mas_scholar_api.memory")

_memory_client = None
_memory_embedder = None
COLLECTION_NAME = "user_interactions"

async def initialize_memory_system():
    """Initialize the user interaction memory collection in Qdrant."""
    global _memory_client, _memory_embedder
    
    try:
        from qdrant_client import QdrantClient
        from qdrant_client.models import Distance, VectorParams
        from sentence_transformers import SentenceTransformer
        
        logger.info("🧠 Initializing User Interaction Memory...")
        
        _memory_client = QdrantClient(path="./qdrant_data")
        _memory_embedder = SentenceTransformer("all-MiniLM-L6-v2")
        
        # Check if collection exists
        collections = _memory_client.get_collections().collections
        exists = any(c.name == COLLECTION_NAME for c in collections)
        
        if not exists:
            logger.info("📦 Creating user_interactions collection...")
            _memory_client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=384, distance=Distance.COSINE)
            )
            logger.info("✅ User interaction memory initialized")
        else:
            logger.info("💾 Loaded existing user interaction memory")
            
        return True
        
    except Exception as e:
        logger.warning(f"⚠️ Memory system unavailable: {e}")
        return False


def get_user_id(profile: Dict) -> str:
    """Generate a stable user ID from profile data."""
    key = f"{profile.get('name', 'anon')}_{profile.get('category', '')}_{profile.get('state', '')}"
    return hashlib.md5(key.encode()).hexdigest()[:12]


async def log_interaction(
    user_id: str,
    scholarship_id: str,
    scholarship_name: str,
    interaction_type: str,  # "search", "click", "shortlist"
    query: str = ""
):
    """Log a user interaction to Qdrant memory."""
    if not _memory_client or not _memory_embedder:
        return
    
    try:
        from qdrant_client.models import PointStruct
        import uuid
        
        # Create semantic vector from interaction context
        text = f"{interaction_type} {scholarship_name} {query}".strip()
        vector = _memory_embedder.encode(text).tolist()
        
        point = PointStruct(
            id=str(uuid.uuid4()),
            vector=vector,
            payload={
                "user_id": user_id,
                "scholarship_id": scholarship_id,
                "scholarship_name": scholarship_name,
                "interaction_type": interaction_type,
                "query": query,
                "timestamp": datetime.now().isoformat()
            }
        )
        
        _memory_client.upsert(collection_name=COLLECTION_NAME, points=[point])
        logger.info(f"📝 Logged {interaction_type} interaction for user {user_id}")
        
    except Exception as e:
        logger.error(f"❌ Failed to log interaction: {e}")


async def get_user_history(user_id: str, limit: int = 10) -> List[Dict]:
    """Retrieve recent interactions for a user."""
    if not _memory_client:
        return []
    
    try:
        from qdrant_client.models import Filter, FieldCondition, MatchValue
        
        # Query by user_id filter
        results = _memory_client.scroll(
            collection_name=COLLECTION_NAME,
            scroll_filter=Filter(
                must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))]
            ),
            limit=limit,
            with_payload=True
        )
        
        # Safely handle empty results (scroll returns tuple: (points, next_offset))
        points = results[0] if results and len(results) > 0 else []
        interactions = [point.payload for point in points] if points else []
        # Sort by timestamp descending
        interactions.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

        return interactions[:limit]
        
    except Exception as e:
        logger.error(f"❌ Failed to retrieve history: {e}")
        return []


async def get_personalization_boost(user_id: str, query: str) -> Dict[str, float]:
    """
    Get scholarship IDs that should be boosted based on user history.
    Returns a dict of scholarship_id -> boost_score (0.0 to 0.2)
    """
    if not _memory_client or not _memory_embedder:
        return {}
    
    try:
        from qdrant_client.models import Filter, FieldCondition, MatchValue
        
        # Get user's interaction embeddings
        query_vector = _memory_embedder.encode(query).tolist()
        
        results = _memory_client.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_vector,
            query_filter=Filter(
                must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))]
            ),
            limit=20
        )
        
        # Build boost map - scholarships user interacted with get a small boost
        boosts = {}
        for result in results:
            sid = result.payload.get("scholarship_id")
            if sid:
                # Interaction type weights
                itype = result.payload.get("interaction_type", "search")
                weight = {"shortlist": 0.15, "click": 0.10, "search": 0.05}.get(itype, 0.05)
                # Combine with similarity score
                boost = min(weight * result.score, 0.3)  # Cap at 0.3
                boosts[sid] = max(boosts.get(sid, 0), boost)
        
        if boosts:
            logger.info(f"🧠 Memory boost applied: {len(boosts)} scholarships influenced")
        
        return boosts
        
    except Exception as e:
        logger.error(f"❌ Personalization failed: {e}")
        return {}
