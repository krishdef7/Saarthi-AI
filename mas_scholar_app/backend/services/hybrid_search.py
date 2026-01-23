"""
🔀 Hybrid Search Engine
=======================
Combines Vector Search (Qdrant) + BM25 Keyword Search using RRF Fusion.

Pipeline:
1. Generate query embedding
2. BM25 lexical search (fallback/primary for simple queries)
3. Vector similarity search (semantic matching)
4. Reciprocal Rank Fusion (RRF) to merge results
5. Eligibility scoring boost
6. Safety penalties (scam detection)
"""

import re
import math
import time
import logging
import hashlib
import asyncio
from typing import Dict, List, Optional, Tuple, Any
from collections import defaultdict
from dataclasses import dataclass, field

from sentence_transformers import SentenceTransformer

from .eligibility import calculate_eligibility_match, compute_radar_scores
from .safety import validate_scholarship, get_deadline_info

logger = logging.getLogger("mas_scholar_api.search")

# Global state
_scholarships: List[Dict] = []
_bm25_index: Dict = {}
_embedder = None
_qdrant_client = None
_search_mode = "bm25"  # "hybrid", "vector", "bm25"

# ============================================================================
# BM25 RETRIEVER
# ============================================================================

class BM25Retriever:
    """Classic BM25 keyword retrieval."""
    
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.documents: Dict[str, str] = {}
        self.doc_lengths: Dict[str, int] = {}
        self.avg_doc_length: float = 0
        self.term_frequencies: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        self.doc_frequencies: Dict[str, int] = defaultdict(int)
        self.N: int = 0
    
    def add_document(self, doc_id: str, text: str):
        """Add a document to the index."""
        tokens = self._tokenize(text)
        self.documents[doc_id] = text
        self.doc_lengths[doc_id] = len(tokens)
        
        seen_terms = set()
        for token in tokens:
            self.term_frequencies[doc_id][token] += 1
            if token not in seen_terms:
                self.doc_frequencies[token] += 1
                seen_terms.add(token)
        
        self.N += 1
        self.avg_doc_length = sum(self.doc_lengths.values()) / self.N if self.N > 0 else 0
    
    def _tokenize(self, text: str) -> List[str]:
        """Simple tokenization."""
        text = text.lower()
        tokens = re.findall(r'\b\w+\b', text)
        return tokens
    
    def search(self, query: str, top_k: int = 20) -> List[Tuple[str, float]]:
        """BM25 search."""
        query_tokens = self._tokenize(query)
        scores: Dict[str, float] = defaultdict(float)
        
        for token in query_tokens:
            if token not in self.doc_frequencies:
                continue
            
            df = self.doc_frequencies[token]
            idf = math.log((self.N - df + 0.5) / (df + 0.5) + 1)
            
            for doc_id in self.documents:
                tf = self.term_frequencies[doc_id].get(token, 0)
                if tf == 0:
                    continue
                
                doc_len = self.doc_lengths[doc_id]
                numerator = tf * (self.k1 + 1)
                denominator = tf + self.k1 * (1 - self.b + self.b * doc_len / self.avg_doc_length)
                scores[doc_id] += idf * numerator / denominator
        
        sorted_results = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return sorted_results[:top_k]

# Global BM25 instance
_bm25 = BM25Retriever()

# ============================================================================
# INITIALIZATION
# ============================================================================

async def initialize_search_engine(scholarships: List[Dict]):
    """Initialize the search engine with scholarship data."""
    global _scholarships, _bm25, _search_mode, _embedder, _qdrant_client
    
    _scholarships = scholarships
    
    # Build BM25 index
    logger.info("📚 Building BM25 index...")
    _bm25 = BM25Retriever()
    
    for sch in scholarships:
        doc_id = sch.get("id", hashlib.md5(sch.get("name", "").encode()).hexdigest())
        text = f"{sch.get('name', '')} {sch.get('provider', '')} {sch.get('description', '')} {' '.join(sch.get('category', []))}"
        _bm25.add_document(doc_id, text)
    
    logger.info(f"✅ BM25 index built with {_bm25.N} documents")
    
    # Try to initialize vector search
    try:
        from sentence_transformers import SentenceTransformer
        from qdrant_client import QdrantClient
        from qdrant_client.models import Distance, VectorParams, PointStruct
        
        logger.info("🔌 Initializing vector search...")
        
        # Load embedding model
        _embedder = SentenceTransformer("all-MiniLM-L6-v2")
        
        # Initialize PERSISTENT Qdrant
        _qdrant_client = QdrantClient(path="./qdrant_data")
        
        # Check if collection exists to avoid recreation
        collections = _qdrant_client.get_collections().collections
        exists = any(c.name == "scholarships" for c in collections)
        
        if not exists:
            logger.info("📦 Creating new Qdrant collection...")
            _qdrant_client.recreate_collection(
                collection_name="scholarships",
                vectors_config=VectorParams(size=384, distance=Distance.COSINE)
            )
            
            # Index scholarships ONLY if new collection
            points = []
            for i, sch in enumerate(scholarships):
                doc_id = sch.get("id", f"sch_{i}")
                text = f"{sch.get('name', '')} {sch.get('description', '')} {' '.join(sch.get('category', []))}"
                embedding = _embedder.encode(text).tolist()
                
                points.append(PointStruct(
                    id=i,
                    vector=embedding,
                    payload={"doc_id": doc_id, "index": i}
                ))
            
            _qdrant_client.upsert(collection_name="scholarships", points=points)
            logger.info(f"✅ Indexed {len(points)} scholarships to persistent storage")
        else:
             logger.info("💾 Loaded existing Qdrant collection")
        
        _search_mode = "hybrid"
        logger.info(f"✅ Vector search initialized with {len(points)} vectors")
        
    except Exception as e:
        logger.warning(f"⚠️ Vector search unavailable, using BM25 only: {e}")
        _search_mode = "bm25"

def get_search_status() -> Dict:
    """Get current search engine status."""
    return {
        "mode": _search_mode,
        "bm25_documents": _bm25.N if _bm25 else 0,
        "vector_enabled": _qdrant_client is not None,
        "total_scholarships": len(_scholarships)
    }

# ============================================================================
# SEARCH FUNCTIONS
# ============================================================================

def vector_search(query: str, top_k: int = 20) -> List[Tuple[str, float]]:
    """Perform vector similarity search."""
    if not _qdrant_client or not _embedder:
        return []
    
    try:
        query_embedding = _embedder.encode(query).tolist()
        
        results = _qdrant_client.search(
            collection_name="scholarships",
            query_vector=query_embedding,
            limit=top_k
        )
        
        return [
            (_scholarships[r.payload["index"]].get("id"), r.score)
            for r in results
        ]
    except Exception as e:
        logger.error(f"Vector search failed: {e}")
        return []

def rrf_fusion(result_lists: List[List[Tuple[str, float]]], k: int = 60) -> List[Tuple[str, float]]:
    """
    Reciprocal Rank Fusion (RRF) to combine multiple result lists.
    
    Formula: RRF(d) = Σ 1/(k + rank(d))
    """
    scores: Dict[str, float] = defaultdict(float)
    
    for results in result_lists:
        for rank, (doc_id, _) in enumerate(results, 1):
            scores[doc_id] += 1.0 / (k + rank)
    
    sorted_results = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return sorted_results

async def search_scholarships(
    query: str,
    profile: Dict,
    filters: Optional[Dict] = None,
    top_k: int = 20,
    only_eligible: bool = False
) -> Tuple[List[Dict], float, List[str]]:
    """
    Production hybrid search with RRF fusion.
    
    Args:
        query: Search query text
        profile: User profile for eligibility matching
        filters: Category, state, etc. filters
        top_k: Number of results to return
        only_eligible: Only return eligible scholarships
    
    Returns:
        Tuple of (results, latency_ms, search_logs)
    """
    start = time.time()
    logs = []
    filters = filters or {}
    
    logs.append(f"🔍 Query: '{query}' | Mode: {_search_mode}")
    
    # =========================================================================
    # STEP 1: Retrieve candidates
    # =========================================================================
    
    if _search_mode == "hybrid" and query:
        # Run both BM25 and vector search in thread pool to avoid blocking
        bm25_results = await asyncio.to_thread(_bm25.search, query, 50)
        logs.append(f"📝 BM25: {len(bm25_results)} matches")
        
        vector_results = await asyncio.to_thread(vector_search, query, 50)
        logs.append(f"🧠 Vector: {len(vector_results)} matches")
        
        # RRF fusion
        fused = rrf_fusion([bm25_results, vector_results])
        logs.append(f"🔀 RRF Fusion: {len(fused)} merged results")
        
        candidate_ids = [doc_id for doc_id, _ in fused[:top_k * 2]]
        
    elif query:
        # BM25 only - run in thread pool
        bm25_results = await asyncio.to_thread(_bm25.search, query, 50)
        logs.append(f"📝 BM25: {len(bm25_results)} matches")
        candidate_ids = [doc_id for doc_id, _ in bm25_results]
        
    else:
        # No query - return all scholarships
        candidate_ids = [s.get("id") for s in _scholarships]
        logs.append(f"📚 Browsing all {len(candidate_ids)} scholarships")
    
    # =========================================================================
    # STEP 2: Fetch full scholarship data
    # =========================================================================
    
    id_to_sch = {s.get("id"): s for s in _scholarships}
    candidates = [id_to_sch.get(doc_id) for doc_id in candidate_ids if doc_id in id_to_sch]
    
    # =========================================================================
    # STEP 3: Apply filters
    # =========================================================================
    
    filtered = []
    for sch in candidates:
        # Category filter
        if filters.get("category") and filters["category"] != "All":
            if filters["category"] not in sch.get("category", []):
                continue
        
        # State filter
        if filters.get("state") and filters["state"] not in ["All India", ""]:
            sch_states = sch.get("states", [])
            if sch_states and filters["state"] not in sch_states:
                continue
        
        filtered.append(sch)
    
    logs.append(f"🎯 After filters: {len(filtered)} results")
    
    # =========================================================================
    # STEP 4: Calculate eligibility and enrich
    # =========================================================================
    
    results = []
    for sch in filtered:
        # Calculate eligibility
        score, reasons, status = calculate_eligibility_match(sch, profile)
        
        # Skip if only_eligible and not eligible
        if only_eligible and status == "not_eligible":
            continue
        
        # Validate and enrich with safety info
        safety_info = validate_scholarship(sch)
        radar_scores = compute_radar_scores(reasons)
        
        # Build enriched result
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
    
    # =========================================================================
    # STEP 5: Sort by match score
    # =========================================================================
    
    results.sort(key=lambda x: x.get("match_score", 0), reverse=True)
    results = results[:top_k]
    
    latency = (time.time() - start) * 1000
    logs.append(f"⚡ Total latency: {latency:.1f}ms")
    logs.append(f"✅ Returning {len(results)} results")
    
    return results, latency, logs
