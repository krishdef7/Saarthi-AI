# System Architecture

## Overview

Saarthi AI implements a **Multi-Agent System (MAS)** architecture where specialized agents collaborate to deliver personalized, accurate scholarship matches.

## High-Level Architecture

```
                                 ┌─────────────────────────────────────┐
                                 │         Student Interface           │
                                 │   (Next.js + WebSocket Client)      │
                                 └──────────────┬──────────────────────┘
                                                │
                                                ▼
┌────────────────────────────────────────────────────────────────────────────────────┐
│                              FastAPI Orchestrator                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Query Agent  │  │ Retrieval    │  │ Memory       │  │ Eligibility  │           │
│  │              │  │ Agent        │  │ Agent        │  │ Agent        │           │
│  │ • Parse      │  │ • BM25       │  │ • User       │  │ • Deterministic│         │
│  │ • Understand │  │ • Vector     │  │   history    │  │ • Rule-based │           │
│  │ • Normalize  │  │ • RRF Fusion │  │ • Boost calc │  │ • Zero LLM   │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                  │                  │                  │                  │
│         └──────────────────┴─────────┬────────┴──────────────────┘                  │
│                                      │                                              │
│                                      ▼                                              │
│                         ┌─────────────────────────┐                                 │
│                         │   Result Aggregator     │                                 │
│                         │   • Merge scores        │                                 │
│                         │   • Apply penalties     │                                 │
│                         │   • Sort & limit        │                                 │
│                         └─────────────────────────┘                                 │
│                                      │                                              │
│                                      ▼                                              │
│              ┌───────────────────────┴──────────────────────────┐                  │
│              │              Low Confidence?                      │                  │
│              │               (max_score < 60)                    │                  │
│              └───────────────────────┬──────────────────────────┘                  │
│                        YES ──────────┴────────── NO                                │
│                         │                        │                                  │
│                         ▼                        │                                  │
│              ┌─────────────────────┐            │                                  │
│              │  Research Agent     │            │                                  │
│              │  (Fallback Web)     │            │                                  │
│              └─────────────────────┘            │                                  │
│                         │                        │                                  │
│                         └────────────┬───────────┘                                  │
│                                      ▼                                              │
│                         ┌─────────────────────────┐                                 │
│                         │   WebSocket Streamer    │                                 │
│                         │   (Live Reasoning UI)   │                                 │
│                         └─────────────────────────┘                                 │
└────────────────────────────────────────────────────────────────────────────────────┘
                                                │
                    ┌───────────────────────────┼───────────────────────────┐
                    │                           │                           │
                    ▼                           ▼                           ▼
         ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
         │  Qdrant Vector   │       │  BM25 Index      │       │  User Memory     │
         │  (scholarships)  │       │  (in-memory)     │       │  (interactions)  │
         │  384-dim vectors │       │  TF-IDF          │       │  Qdrant collection│
         └──────────────────┘       └──────────────────┘       └──────────────────┘
```

## Agent Responsibilities

### 1. Query Agent
- **Purpose**: Understand and normalize user search intent
- **Input**: Raw search query (natural language, Hindi, exact IDs)
- **Output**: Structured query representation
- **Technology**: Pure Python, no LLM

### 2. Retrieval Agent
- **Purpose**: Find relevant scholarships from knowledge base
- **Strategy**: Hybrid BM25 + Vector search with RRF fusion
- **Components**:
  - BM25 Retriever (exact keyword matching)
  - Vector Search (semantic similarity via Qdrant)
  - RRF Fusion (k=60 for rank combination)

### 3. Memory Agent
- **Purpose**: Personalize results based on user history
- **Data Store**: Qdrant `user_interactions` collection
- **Safeguards**:
  - 30% maximum boost cap
  - Exponential decay (7-day half-life)
  - Cold start handling (min 2 interactions)

### 4. Eligibility Agent
- **Purpose**: Deterministic eligibility verification
- **Method**: 100-point rule-based scoring
- **Criteria**: Category (30), Income (25), State (15), Gender (10), Education (10), Trust (10)
- **Guarantee**: Zero LLM involvement, zero hallucinations

### 5. Research Agent (Fallback)
- **Purpose**: Handle edge cases with web search
- **Trigger**: max_score < 60 (low confidence)
- **Source**: DuckDuckGo API (India-restricted)
- **Frequency**: ~18% of queries

## Data Flow Sequence

```
User Query
    │
    ▼
┌─────────────────┐
│ 1. WebSocket    │ ◄─── Establish connection
│    Connect      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Query        │ ◄─── Emit: "query_understanding"
│    Understanding│      Parse intent, detect language
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. BM25 Search  │ ◄─── Emit: "bm25_search"
│                 │      Keyword matching (50 candidates)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. Vector Search│ ◄─── Emit: "vector_search"
│                 │      Semantic matching (50 candidates)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. RRF Fusion   │ ◄─── Emit: "rrf_fusion"
│                 │      Merge results, remove duplicates
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 6. Memory Boost │ ◄─── Emit: "memory_boost"
│                 │      Apply personalization scores
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 7. Eligibility  │ ◄─── Emit: "eligibility_check"
│    Check        │      Score each scholarship (0-100)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 8. Complete     │ ◄─── Emit: "complete"
│                 │      Return final ranked results
└─────────────────┘
```

## Design Decisions

| Decision | Alternative Considered | Rationale |
|----------|----------------------|-----------|
| Hybrid Search (BM25+Vector) | Pure vector only | Handles both exact IDs and semantic intent |
| Deterministic Eligibility | LLM-based checking | Zero hallucinations, legal compliance |
| WebSocket Streaming | REST polling | Real-time agent visibility, better UX |
| Qdrant for Memory | PostgreSQL history | Semantic similarity on interactions |
| Fallback Agent | Agent-first design | 82% queries fast (<60ms), agent for edge cases |

## Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| P50 Latency | 38ms | Typical query |
| P95 Latency | 59ms | Complex queries |
| Max Concurrent | 100+ | Limited by Qdrant |
| Memory Footprint | ~500MB | Backend + embedder |
| Vector Dimensions | 384 | all-MiniLM-L6-v2 |

## Security Architecture

1. **Input Sanitization**: All user inputs validated via Pydantic
2. **Rate Limiting**: 10 requests/minute per client
3. **CORS**: Explicit origin whitelist (no wildcards with credentials)
4. **LLM Isolation**: Gemini used only for optional OCR, never for core logic
5. **No PII Storage**: User interactions stored with anonymized IDs
