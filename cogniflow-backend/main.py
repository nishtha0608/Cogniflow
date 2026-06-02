"""CogniFlow FastAPI backend — SQLite, no Docker required."""
import subprocess
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.rate_limit import RateLimitMiddleware
from app.core.database import engine
from app.models import Base  # noqa — registers all models
from app.routers import apps, auth, entities, files, integrations, ai_features, papers, writing, rag


def run_migrations():
    """Run Alembic migrations (creates/updates SQLite DB on first run)."""
    try:
        result = subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            capture_output=True,
            text=True,
            timeout=60,
        )
        if result.returncode != 0:
            print(f"[MIGRATION] Warning: {result.stderr.strip()}")
        else:
            print(f"[MIGRATION] {result.stdout.strip() or 'Schema up to date'}")
    except Exception as e:
        print(f"[MIGRATION] Failed: {e}")


def seed_demo_user():
    """Create demo user if it doesn't exist."""
    from sqlalchemy.orm import Session
    from app.services.crud import get_or_create_demo_user

    with Session(engine) as db:
        user = get_or_create_demo_user(db)
        print(f"[SEED] Demo user: {user.email}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[STARTUP] Applying database migrations...")
    run_migrations()
    print("[STARTUP] Seeding demo user...")
    seed_demo_user()
    print("[STARTUP] CogniFlow API is ready at http://localhost:8000")
    yield


app = FastAPI(
    title="CogniFlow API",
    description="Research assistant backend — SQLite, no Docker needed",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware)

app.include_router(auth.router)
app.include_router(entities.router)
app.include_router(integrations.router)
app.include_router(files.router)
app.include_router(apps.router)
app.include_router(ai_features.router)
app.include_router(rag.router)
app.include_router(papers.router)
app.include_router(writing.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "CogniFlow API", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}
