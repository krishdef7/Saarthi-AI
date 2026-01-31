# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Saarthi AI is a multi-agent scholarship discovery system built for the Convolve 4.0 Qdrant MAS Track. It uses hybrid retrieval (BM25 + Vector + RRF fusion) with Qdrant for semantic search and user memory personalization.

## Development Commands

### Prerequisites
- Python 3.10+
- Node.js 18+
- Docker (for Qdrant)

### Starting Qdrant
```bash
docker-compose up -d
# Or directly: docker run -d -p 6333:6333 qdrant/qdrant
```

### Backend (FastAPI)
```bash
cd mas_scholar_app/backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Seed Qdrant with scholarship data
python -m scripts.seed_data

# Run API server
uvicorn main:app --reload --port 8000
```

### Frontend (Next.js)
```bash
cd mas_scholar_app/frontend
npm ci
set NEXT_PUBLIC_API_URL=http://localhost:8000  # Windows
export NEXT_PUBLIC_API_URL=http://localhost:8000  # Linux/Mac
npm run dev
```

### Testing
```bash
# Backend endpoint tests (requires running server on port 8001)
cd mas_scholar_app/backend
python test_endpoints.py
```

### Health Checks
```bash
curl http://localhost:8000/        # API health
curl http://localhost:6333/collections  # Qdrant health
```

## Architecture

### Backend Services (`mas_scholar_app/backend/services/`)

- **hybrid_search.py**: Core search engine combining BM25 lexical search with Qdrant vector search using Reciprocal Rank Fusion (RRF). Initializes on startup with `all-MiniLM-L6-v2` embeddings (384-dim).

- **user_memory.py**: Stores user interactions in a separate Qdrant collection (`user_interactions`) for personalization. Provides boost scores based on past click/shortlist behavior with decay.

- **eligibility.py**: Deterministic Python-based eligibility matching—no LLM inference for legal criteria.

- **safety.py**: Trust scoring and scam detection using regex patterns.

### Qdrant Collections

1. **scholarships**: Main knowledge base with 185 verified entries. Vector: 384-dim (all-MiniLM-L6-v2). Indexed payloads: category, income_limit, states.

2. **user_interactions**: Behavioral memory per user. Stores interaction embeddings with type, weight, and timestamp for personalization.

### API Routers (`mas_scholar_app/backend/routers/`)
- `search.py` - Hybrid search with profile-based eligibility
- `scholarships.py` - CRUD for scholarship data
- `eligibility.py` - Eligibility checks
- `scan.py` - OCR/document processing

### Configuration
All config is centralized in `scripts/config.py` using dataclasses. Key settings:
- Embedding model: `all-MiniLM-L6-v2`
- HNSW: M=16, ef_construct=128
- Data path: `backend/data/scholarships.json`

## Key Design Decisions

- **Hybrid Search over pure vector**: Handles both exact IDs (BM25) and semantic intent (vector).
- **Deterministic eligibility**: Python rules only, never LLM—zero hallucinations for legal criteria.
- **Memory cap at 30%**: Prevents filter bubbles while enabling personalization.
- **Qdrant persistent storage**: Uses `./qdrant_data` directory, not in-memory.

## Environment Variables

Copy `.env.example` to `.env`:
```
QDRANT_HOST=localhost
QDRANT_PORT=6333
GEMINI_API_KEY=your_key  # Optional, for OCR features
```
