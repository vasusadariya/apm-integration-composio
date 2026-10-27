"""
FastAPI backend for OAuth Setup Guide Platform.
Serves pre-built guides and streams AI-generated guides via SSE.
"""
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agent.researcher import stream_guide_generation

load_dotenv()

app = FastAPI(
    title="OAuth Setup Guide API",
    description="Composio APM Integration — OAuth guide library and live generation",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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
    guide_path = LIBRARY_DIR / f"{slug}.json"
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


@app.post("/api/generate")
async def generate_guide(request: GenerateRequest):
    """
    Stream guide generation for any app via SSE.
    Uses Gemini + Google Search to research and generate the guide in real time.
    """
    api_key = get_api_key()
    if not api_key or api_key == "your_gemini_api_key_here":
        raise HTTPException(
            status_code=400,
            detail="GEMINI_API_KEY is not configured or still set to placeholder in backend/.env. Please get a free API key at https://aistudio.google.com/app/apikey and add it to backend/.env."
        )

    async def event_stream():
        async for chunk in stream_guide_generation(
            app_name=request.app_name,
            website_url=request.website_url,
            api_key=api_key,
        ):
            yield chunk

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

