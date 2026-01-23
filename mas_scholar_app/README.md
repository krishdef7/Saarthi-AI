# Saarthi AI - Guide to Scholarship Success

AI-powered scholarship discovery platform with hybrid search and explainable eligibility matching.

## Quick Start

### 1. Start the Backend

```bash
cd backend

# Create virtual environment (first time)
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Run the API
uvicorn main:app --reload --port 8000
```

API will be available at: http://localhost:8000

### 2. Start the Frontend

```bash
cd frontend

# Install dependencies (first time)
npm install

# Run the dev server
npm run dev
```

Frontend will be available at: http://localhost:3000

## Features

### Backend (FastAPI)
- 🔀 Hybrid Search: BM25 + Vector (Qdrant) with RRF Fusion
- 📋 100-point Eligibility Scoring System
- 🛡️ Scam Detection (23+ fraud patterns)
- ⏳ Smart Deadline Parsing
- 🔌 WebSocket support for real-time updates
- 📊 185+ verified scholarships

### Frontend (Next.js)
- 🎨 Cyber-Glass dark theme with glassmorphism
- 🧠 Memory Stream sidebar (agent personality)
- 📊 XAI Radar chart for eligibility visualization
- 🔍 Real-time search with filters
- 📱 Mobile responsive design
- ⚡ Fast page transitions with Framer Motion

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scholarships` | GET | List all scholarships |
| `/api/scholarships/{id}` | GET | Get scholarship details |
| `/api/search` | POST | Hybrid search with profile |
| `/api/eligibility` | POST | Calculate eligibility score |
| `/api/statistics` | GET | Dashboard metrics |
| `/ws/agent` | WS | Real-time agent events |

## Architecture

```
mas_scholar_app/
├── backend/
│   ├── main.py              # FastAPI entry
│   ├── routers/             # API routes
│   ├── services/            # Business logic
│   └── models/              # Pydantic schemas
├── frontend/
│   ├── src/app/             # Next.js pages
│   ├── src/components/      # React components
│   └── src/app/globals.css  # Cyber-Glass theme
└── shared/
    └── data/                # Scholarship JSON
```

## Demo Mode

If the backend is unavailable, the frontend automatically falls back to demo data for a seamless presentation.

## Tech Stack

- **Backend**: FastAPI, Pydantic, Qdrant, Sentence-Transformers
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Framer Motion, Recharts
- **Search**: BM25 + Vector similarity with RRF fusion
