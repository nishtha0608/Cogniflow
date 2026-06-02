# CogniFlow Backend

FastAPI backend for CogniFlow — uses **SQLite** (no PostgreSQL, no Docker required).

---

## Quick Start (2 commands)

### Terminal 1 — Backend
```bash
cd cogniflow-backend
pip install -r requirements.txt
uvicorn main:app --reload
```
API runs at **http://localhost:8000**
SQLite database auto-created as `cogniflow.db` on first run.

### Terminal 2 — Frontend
```bash
cd cogniflow-base-44
npm install
npm run dev
```
App runs at **http://localhost:5173** — opens with zero login required.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | _(empty)_ | Your OpenAI key — app uses mock data if omitted |
| `OPENAI_MODEL` | `gpt-4o` | Model to use |
| `SECRET_KEY` | (insecure default) | JWT secret — change in production |
| `DATABASE_URL` | `sqlite:///./cogniflow.db` | Switch to `postgresql://...` for prod |
| `UPLOAD_DIR` | `/tmp/uploads` | Where uploaded files are stored |

---

## Demo Flow

After both servers are running:

1. **Dashboard** — loads at http://localhost:5173, no login needed (auto demo user)
2. **Projects** → New Project → fill form → Create → appears in list
3. **Documents** → Upload → pick a PDF → word_count populated
4. **Research Chat** → New Conversation → type question → GPT-4o responds
5. **Gap Analyzer** → type topic → Analyze Gaps → gaps listed
6. **Viva Simulator** → Begin Examination → question generated → submit answer → feedback

---

## Architecture

```
cogniflow-backend/
├── main.py              # FastAPI app + startup (migrations + demo seed)
├── requirements.txt
├── alembic/             # DB migrations (auto-run on startup)
└── app/
    ├── core/
    │   ├── config.py    # Settings (reads .env)
    │   ├── database.py  # SQLite engine
    │   └── security.py  # JWT + auto demo user
    ├── models/          # SQLAlchemy ORM models
    ├── schemas/         # Pydantic I/O schemas
    ├── routers/
    │   ├── auth.py      # /api/auth/*
    │   ├── entities.py  # /api/entities/* (generic CRUD)
    │   ├── integrations.py  # InvokeLLM, UploadFile, ExtractData
    │   ├── files.py     # /api/files/* (static serve)
    │   └── apps.py      # /api/apps/public/* (mock)
    └── services/
        ├── crud.py      # Generic DB operations
        ├── llm.py       # OpenAI GPT-4o + mock fallback
        ├── storage.py   # Local file storage
        └── pdf.py       # PyMuPDF text extraction
```

## Mock Mode

No `OPENAI_API_KEY`? The app still works — all AI calls return rich mock data shaped to match the JSON schema the frontend expects.
