"""
FastAPI backend for OAuth Setup Guide Platform.
Serves pre-built guides and streams AI-generated guides via SSE.
"""
import json
import os
import re
import time
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agent.jobs import get_job, start_job, stream_events
from agent.researcher import GENERATED_DIR

load_dotenv()

app = FastAPI(
    title="OAuth Setup Guide API",
    description="Composio APM Integration — OAuth guide library and live generation",
    version="1.0.0",
)

# Comma-separated list of allowed frontend origins; defaults to "*" for local dev.
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

LIBRARY_DIR = Path(__file__).parent / "guides" / "library"


def get_api_key() -> str:
    """Retrieve the current GEMINI_API_KEY, reloading .env if needed."""
    load_dotenv(override=True)
    return os.getenv("GEMINI_API_KEY", "").strip()


# ─── Guide Library ────────────────────────────────────────────────────────────

def load_guide(slug: str) -> dict:
    """Load a pre-built guide JSON by slug."""
    if not re.fullmatch(r"[a-z0-9-]+", slug):
        raise HTTPException(status_code=404, detail="Invalid guide slug")
    guide_path = LIBRARY_DIR / f"{slug}.json"
    if not guide_path.exists():
        guide_path = GENERATED_DIR / f"{slug}.json"
    if not guide_path.exists():
        raise HTTPException(status_code=404, detail=f"Guide '{slug}' not found in library")
    with open(guide_path) as f:
        return json.load(f)


def list_all_guides() -> list[dict]:
    """Return summary cards for all library guides."""
    guides = []
    for guide_file in sorted(LIBRARY_DIR.glob("*.json")):
        with open(guide_file) as f:
            data = json.load(f)
        guides.append({
            "app": data["app"],
            "slug": data["slug"],
            "website": data["website"],
            "logo_url": data["logo_url"],
            "difficulty": data["difficulty"],
            "setup_time_estimate": data["setup_time_estimate"],
            "approval_time_estimate": data["approval_time_estimate"],
            "requires_approval": data["requires_approval"],
            "composio_managed_auth": data["composio_managed_auth"],
            "summary": data["summary"],
            "confidence": data["confidence"],
        })
    return guides


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/api/guides")
def get_all_guides():
    """List all pre-built guides in the library."""
    return list_all_guides()


@app.get("/api/guides/{slug}")
def get_guide(slug: str):
    """Get a specific pre-built guide by slug."""
    return load_guide(slug)


@app.get("/api/search")
def search_guides(q: str = ""):
    """Search guides by app name or keyword."""
    all_guides = list_all_guides()
    if not q:
        return all_guides
    q_lower = q.lower()
    return [
        g for g in all_guides
        if q_lower in g["app"].lower() or q_lower in g["website"].lower()
    ]


class GenerateRequest(BaseModel):
    app_name: str
    website_url: str | None = None
    fresh: bool = False  # skip cache and library: run a live research pass


# Simple per-IP limiter for the expensive endpoint (in-memory; resets on restart).
RATE_LIMIT_PER_HOUR = int(os.getenv("RATE_LIMIT_PER_HOUR", "12"))
_hits: dict[str, list[float]] = {}


def check_rate_limit(ip: str) -> None:
    now = time.time()
    recent = [t for t in _hits.get(ip, []) if now - t < 3600]
    if len(recent) >= RATE_LIMIT_PER_HOUR:
        raise HTTPException(status_code=429, detail=f"Rate limit reached ({RATE_LIMIT_PER_HOUR} generations per hour). Please try again later.")
    recent.append(now)
    _hits[ip] = recent


@app.post("/api/generate")
async def generate_guide(request: GenerateRequest, http_request: Request):
    """
    Start (or rejoin) a background research job for an app.
    Follow it with GET /api/jobs/{id}/events — it survives page refreshes.
    """
    app_name = request.app_name.strip()
    if not app_name or len(app_name) > 80:
        raise HTTPException(status_code=422, detail="App name must be 1-80 characters.")

    api_key = get_api_key()
    if not api_key or api_key == "your_gemini_api_key_here":
        raise HTTPException(
            status_code=400,
            detail="GEMINI_API_KEY is not configured on the server. Get a free key at https://aistudio.google.com/app/apikey.",
        )

    # Rejoining an existing job costs nothing, so only count genuinely new runs.
    job, reused = start_job(app_name, request.website_url, api_key, request.fresh, before_start=lambda: check_rate_limit(
        (http_request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (http_request.client.host if http_request.client else "unknown"))))
    return {"job_id": job.id, "reused": reused, "status": job.status}


@app.get("/api/jobs/{job_id}")
async def job_status(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Research session not found or expired.")
    return {"job_id": job.id, "app_name": job.app_name, "status": job.status, "events": len(job.events)}


@app.get("/api/jobs/{job_id}/events")
async def job_events(job_id: str, request: Request, start: int = 0):
    """SSE stream that replays all events of a job, then follows it live."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Research session not found or expired.")
    # Browsers resend the last seen event id when an EventSource reconnects.
    last_id = request.headers.get("last-event-id")
    if last_id and last_id.isdigit():
        start = int(last_id) + 1
    return StreamingResponse(
        stream_events(job, max(0, start)),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )
