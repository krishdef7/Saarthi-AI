# Convolve 4.0 Hackathon Submission

## Project Information

**Project Name:** Saarthi AI - Intelligent Scholarship Discovery
**Track:** Qdrant Multi-Agent Systems
**Team:** Saarthi AI

## Links

- **GitHub Repository:** https://github.com/krishdef7/Saarthi-AI
- **Live Backend API:** https://saarthi-ai-8vwu.onrender.com
- **API Documentation:** https://saarthi-ai-8vwu.onrender.com/docs
- **Documentation:** [README.md](README.md)

---

## Project Description (300 words)

Saarthi AI is India's first scholarship discovery system with **live multi-agent reasoning visualization**. Unlike traditional search engines that treat scholarship matching as a simple keyword problem, we architect it as a collaborative multi-agent system where specialized agents work together transparently.

### The Problem

85% of eligible Indian students never find scholarships meant for them. Existing platforms show 1000+ irrelevant results, offer no personalization, and users have no visibility into why certain scholarships match.

### Our Solution

Five specialized AI agents collaborate to deliver personalized, accurate matches:

1. **Query Agent** - Analyzes search intent and normalizes input
2. **Retrieval Agent** - Hybrid search (BM25 + Vector + RRF fusion, 88% Precision@5)
3. **Memory Agent** - Personalization based on user history (+16% NDCG improvement)
4. **Eligibility Agent** - Deterministic rule-based checking (zero hallucinations)
5. **Research Agent** - Fallback web search for edge cases

### Unique Innovation

**Live reasoning visualization.** Users watch agents thinking in real-time via WebSocket-powered UI. No other scholarship system offers this transparency. Students see exactly why they match scholarships, building trust in the system.

### Technical Excellence

- Production-deployed FastAPI backend on Render
- 200 verified scholarships indexed with BM25 search
- Deterministic eligibility scoring (100-point system, zero hallucinations)
- Thread-safe caching and WebSocket connection management
- Graceful degradation (vector search optional for low-memory environments)

### Impact

Students see exactly why they match scholarships, trust the system, and don't miss opportunities. Judges can verify our multi-agent claims by watching live reasoning unfold in the UI.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Python, FastAPI, Qdrant, Sentence Transformers |
| **Frontend** | Next.js 14, React, TailwindCSS, Framer Motion, TypeScript |
| **Vector DB** | Qdrant (dual collections: scholarships + user memory) |
| **Search** | Hybrid BM25 + Vector with RRF Fusion |
| **LLM** | Gemini (optional OCR only, never for core logic) |
| **Infrastructure** | Docker, WebSocket, REST API |

---

## Key Innovations

1. **First scholarship system with live agent visibility** - WebSocket streaming shows each agent's reasoning in real-time
2. **Hybrid search architecture** - Combines keyword precision with semantic understanding
3. **Deterministic eligibility** - Zero LLM hallucinations for legal criteria
4. **Memory-based personalization** - Vector memory with decay and diversity safeguards
5. **Production-ready multi-agent system** - <60ms latency, not just a demo

---

## Judging Criteria Mapping

| Criterion | Weight | Our Implementation |
|-----------|--------|-------------------|
| **Qdrant Expertise** | 30% | Dual collections, hybrid search, HNSW optimization |
| **Memory/Personalization** | 25% | Vector memory, +16% NDCG, filter bubble prevention |
| **Societal Impact** | 20% | Education equity, 200 verified scholarships, trust scoring |
| **Clarity/Reproducibility** | 15% | Full documentation, Docker setup, test suite |
| **Documentation** | 10% | 22-page report, architecture docs, metrics |

---

## Repository Structure

```
saarthi-ai/
├── README.md                    # Main documentation
├── SUBMISSION.md                # This file
├── Saarthi_AI_Final_Submission.pdf  # Technical report
├── docs/
│   ├── ARCHITECTURE.md          # System design
│   └── METRICS.md               # Performance benchmarks
├── mas_scholar_app/
│   ├── backend/                 # FastAPI server
│   └── frontend/                # Next.js app
├── render.yaml                  # Backend deployment
└── .env.example                 # Environment template
```

---

## Quick Start

```bash
# 1. Start Qdrant
docker run -d -p 6333:6333 qdrant/qdrant

# 2. Backend
cd mas_scholar_app/backend
pip install -r requirements.txt
uvicorn main:app --reload

# 3. Frontend
cd mas_scholar_app/frontend
npm install && npm run dev
```

---

## Team

**Builder:** Full-stack development, AI/ML integration, System architecture

---

## Acknowledgments

- Qdrant for the excellent vector database
- National Scholarship Portal for public data
- Open source community (FastAPI, React, sentence-transformers)

---

*Built with purpose for India's students*
*सारथी AI - आपका शिक्षा मार्गदर्शक*
