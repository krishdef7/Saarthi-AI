# ⚖️ Reader Guard: Judge's Quick Reference

**System**: MAS-Scholar (Saarthi AI)  
**Track**: Qdrant - Multi-Agent Systems  
**Outcome**: < 60ms Hybrid Search + Vector Memory + Deterministic Safety.

---

## 🚀 Quickstart (Reproducibility)
Run these commands to spin up the full stack locally.

### Backend
```bash
cd backend
pip install -r requirements.txt
export QDRANT_URL=http://localhost:6333  # Ensure Qdrant is running
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm ci
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
# Open http://localhost:3000
```

---

## 🕵️ Judge's Cheat Sheet (Top Questions)

**Q1: Is this just a wrapper around Qdrant?**
**A:** No. We implemented a custom **Reciprocal Rank Fusion (RRF)** layer that merges BM25 (keywords) with Dense Vectors (semantic). This solves the "Exact vs Intent" problem that standard vector search fails at.

**Q2: How is "Memory" different from chat history?**
**A:** We store **vectors**, not text logs. If you click a "Tech Scholarship", we embed that preference. A future search for "money" will rank "Tech" scholarships higher because of vector similarity in the `user_interactions` collection.

**Q3: Does the Agent fallback hallucinate?**
**A:** No. The Agent is **strictly isolated**. Its results are visually labeled "Web Source" and are never merged into the verified ranking or vector store.

**Q4: How do you prevent scams?**
**A:** We use an **Active Defense** regex layer. Patterns like `"processing fee"` or `"guaranteed selection"` trigger an immediate "High Risk" flag.

**Q5: Why not use an LLM for eligibility?**
**A:** Eligibility is a **binary legal status**. LLMs represent probabilistic gradients. We use 100% deterministic code to ensure no student is falsely promised funds.

---

## 📺 Demo Flow (4 Minutes)
See `DEMO_SCRIPT.md` for the exact timing and click-path.
1.  **Search**: "merit scholarship" (Hybrid RRF).
2.  **Memory**: Click "Engineering" -> Search "money" -> See result re-ranking.
3.  **Agent**: Search "obscure query" -> Trigger Web Agent fallback.
4.  **Scam**: Search "fake scam" -> See red flags.

---

## 🛡️ Media Authenticity Statement
All screenshots and videos in this submission were captured from a **live running local instance** of Saarthi AI. 
*   **Infrastructure**: Qdrant running via Docker on port 6333.
*   **Backend**: FastAPI serving live requests on port 8000.
*   **No Mockups**: Every UI element shown is a functional React component.
*   **Verification**: See `SUBMISSION_MEDIA.md` for forensic proofs of database state and memory logic.
