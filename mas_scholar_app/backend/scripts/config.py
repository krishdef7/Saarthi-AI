"""
MAS-Engine Configuration System
===============================

Design Rationale (Judge Perspective + Pivot Strategy):
- ALL domain-specific settings in ONE place
- Swap domains by changing config, not code
- Enables rapid pivoting if PS changes on Jan 15
- Shows production-grade software design

Current Domain: Scholarships (MAS-Scholar)
Potential Pivots: Healthcare, Disaster, Agriculture, GovBenefits
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from pathlib import Path
import json
import os


@dataclass
class EmbeddingConfig:
    """Embedding model configuration"""
    model_name: str = "all-MiniLM-L6-v2"  # 384 dimensions, fast, good quality
    dimension: int = 384
    batch_size: int = 32
    normalize: bool = True


@dataclass
class QdrantConfig:
    """Qdrant vector database configuration"""
    # Connection
    host: str = "localhost"
    port: int = 6333
    prefer_grpc: bool = True
    
    # Collection names (domain-agnostic naming)
    collection_items: str = "mas_items"
    collection_profiles: str = "mas_profiles"
    collection_interactions: str = "mas_interactions"
    
    # Vector settings
    vector_size: int = 384
    distance_metric: str = "Cosine"
    
    # HNSW indexing (critical for performance)
    hnsw_m: int = 16
    hnsw_ef_construct: int = 128
    
    # Payload indexes for fast filtering (WINNING FEATURE)
    indexed_fields: List[str] = field(default_factory=lambda: [
        "categories",
        "education_levels",
        "states",
        "item_type",
        "income_limit",
        "amount_max",
        "min_percentage",
    ])


@dataclass
class DomainConfig:
    """
    Domain-specific configuration.
    
    PIVOT POINT: Change this to switch domains!
    """
    # Domain identification
    domain_name: str = "scholarships"
    domain_display: str = "Scholarship Navigator"
    
    # Data paths
    # UPDATED: Points to backend/data sibling directory
    data_dir: Path = field(default_factory=lambda: Path(__file__).parent.parent / "data")
    items_file: str = "scholarships.json"
    payloads_file: str = "qdrant_payloads.json"
    profiles_file: str = "test_profiles.json"
    
    # Entity naming (for UI and prompts)
    item_singular: str = "scholarship"
    item_plural: str = "scholarships"
    user_type: str = "student"
    
    # Search settings
    default_search_limit: int = 20
    min_score_threshold: float = 0.5
    
    # Ranking weights (multi-factor scoring)
    ranking_weights: Dict[str, float] = field(default_factory=lambda: {
        "amount": 0.40,
        "confidence": 0.30,
        "urgency": 0.20,
        "relevance": 0.10,
    })
    
    # Memory evolution
    memory_decay_days: int = 180
    memory_reinforcement: float = 1.5


@dataclass
class AgentConfig:
    """Agent behavior configuration"""
    llm_model: str = "gpt-4o-mini"
    llm_temperature: float = 0.1
    max_tokens: int = 1000
    max_retries: int = 3
    cache_enabled: bool = True
    cache_ttl_hours: int = 24


@dataclass
class BenchmarkConfig:
    """Benchmark settings"""
    test_queries: int = 50
    warmup_queries: int = 5
    target_avg_latency_ms: float = 500
    target_p95_latency_ms: float = 1000
    target_precision_at_k: float = 0.70


class MASConfig:
    """Master configuration class"""
    
    def __init__(self):
        self.embedding = EmbeddingConfig()
        self.qdrant = QdrantConfig()
        self.domain = DomainConfig()
        self.agent = AgentConfig()
        self.benchmark = BenchmarkConfig()
    
    def to_dict(self) -> Dict[str, Any]:
        """Export as dictionary"""
        return {
            "embedding": self.embedding.__dict__,
            "qdrant": {k: v for k, v in self.qdrant.__dict__.items()},
            "domain": {k: str(v) if isinstance(v, Path) else v 
                      for k, v in self.domain.__dict__.items()},
            "agent": self.agent.__dict__,
            "benchmark": self.benchmark.__dict__,
        }
    
    def save(self, path: Path):
        """Save to JSON"""
        with open(path, 'w') as f:
            json.dump(self.to_dict(), f, indent=2, default=str)


# ============================================
# DOMAIN PRESETS (for quick pivoting)
# ============================================

def get_scholarship_config() -> MASConfig:
    """Default scholarship domain"""
    return MASConfig()


# Global config instance
_config: Optional[MASConfig] = None


def get_config() -> MASConfig:
    """Get global config"""
    global _config
    if _config is None:
        _config = MASConfig()
    return _config


def set_config(config: MASConfig):
    """Set global config"""
    global _config
    _config = config
