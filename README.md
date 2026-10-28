# OAuth Setup Guide Platform

> **Composio APM Integrations Take-Home Assessment**
> A developer tool that gives AI agent builders clear, actionable guidance for setting up OAuth apps with any provider.

## What It Is

When a developer builds an AI agent with Composio, their users need to connect third-party apps via OAuth. But the developer must first register and get approved for their own OAuth app with each provider — a process that ranges from 30 minutes (GitHub, instant) to 4–6 weeks (Google with sensitive scopes, requires a $4,000+ CASA security audit).

This platform solves that by:

1. **Guide Library** — Pre-researched, structured guides for 12 apps covering the full difficulty spectrum
2. **Live AI Generation** — Submit any app name/URL → a Gemini agent researches it in real time and streams a complete guide

---

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- A [Google Gemini API key](https://aistudio.google.com/app/apikey) (for live guide generation)

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set your Gemini API key
cp .env.example .env
# Edit .env and add: GEMINI_API_KEY=your_key_here (see ../.env.example)

uvicorn main:app --reload
# API running at http://localhost:8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# App running at http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) — the guide library should appear immediately.

---

## Guide Library (12 Apps)

| App | Difficulty | Approval Time | Key Challenge |
|-----|-----------|---------------|---------------|
| GitHub | 🟢 Easy | Instant | None |
| Airtable | 🟢 Easy | Instant | Per-base permission model |
| Slack | 🟡 Medium | 1–7 days (optional) | Bot vs User token model |
| Notion | 🟡 Medium | 1–5 days | Page-level permissions |
| HubSpot | 🟡 Medium | 2–5 days | CRM scope model |
| Dropbox | 🟡 Medium | 1–5 days | Production app approval |
| Microsoft | 🟡 Medium | Instant/days | Admin consent for org scopes |
| Salesforce | 🟠 Hard | 1–3 weeks (AppExchange) | Multi-instance URL complexity |
| Twitter/X | 🟠 Hard | 1–5 days | Paid tier required ($100/mo) |
| Zoom | 🟠 Hard | 3–10 days | Marketplace publishing review |
| LinkedIn | 🔴 Hard | 1–4 weeks | Product-based API access tiers |
| Google | 🔴 Very Hard | 4–6 weeks | CASA security audit ($4K–75K) |

---

## Live Guide Generation

Visit [http://localhost:3000/generate](http://localhost:3000/generate).

Enter any app name (e.g., "Stripe", "Figma", "Shopify") and optionally its website URL. The agent will:

1. Search for the provider's developer portal and OAuth documentation
2. Extract setup steps, scope requirements, and approval processes
3. Identify blockers, prerequisites, and time estimates
4. Stream progress to the UI, then save the guide so it has a shareable `/guide/<slug>` URL

If Google Search grounding is unavailable (quota/model), it falls back to ungrounded generation and the guide's confidence reflects that. AI-generated guides are never marked "verified".

**Requires:** `GEMINI_API_KEY` set in `backend/.env`

---

## Architecture

```
frontend/ (Next.js 15 + TailwindCSS)
  ├── app/page.tsx         # Home: searchable guide library
  ├── app/guide/[slug]/    # Guide page (library + generated)
  ├── app/generate/        # Live AI generation page
  └── components/GuideDetail.tsx  # Shared guide renderer (collapsible steps, checkable requirements)

backend/ (FastAPI + Python)
  ├── main.py              # API server with CORS, SSE streaming
  ├── agent/researcher.py  # Gemini agent with Google Search grounding
  └── guides/library/      # 12 pre-built JSON guides
  └── guides/generated/    # Live-generated guides, cached so /guide/<slug> is shareable (gitignored)
```

**Key technical choices:**
- **SSE (Server-Sent Events)** for live streaming — shows agent progress in real time
- **Gemini Flash + Google Search grounding** — researches official docs on demand
- **JSON flat-file storage** — no database needed, guides are version-controlled
- **No auth/accounts** — shareable guide URLs work without login

---

## Key Design Decisions

### Why flat JSON files instead of a database?
Guides are semi-static reference content. JSON files are portable, version-controlled, diff-friendly, and require zero infrastructure. Any guide can be opened and read directly.

### Why 10 apps instead of 100?
The assignment says "demonstrate a few varied apps." 10 apps cover the full difficulty spectrum (Easy → Very Hard) with meaningfully different challenges. Each guide is genuinely researched rather than generated en masse.

### Why stream the agent output?
Transparency is core to the product value. Developers should see *what* the agent is investigating and *where* it found information — not just receive a black-box result. Streaming also makes the 30–60 second research time feel active rather than dead.

### Why Gemini + Google Search over a pure web scraper?
The agent needs to synthesize information from multiple sources (developer docs, community reports, changelog posts) and structure it into a specific schema. LLMs with search grounding handle this better than rule-based scrapers. The grounding also ensures citations point to real pages.

### What's out of scope (by design)
- No OAuth credentials are generated or stored
- No actual provider account creation is attempted
- No 100-app library (demo subset as specified)
- No database or user accounts (unnecessary complexity)

---

## Evidence & Accuracy

### What was verified
- **GitHub, Airtable**: Confirmed self-service, instant, no approval via official docs
- **Google CASA audit**: Confirmed via Google's own verification policy page and CASA assessor documentation
- **LinkedIn Company Page requirement**: Confirmed — apps cannot be created without it
- **Twitter/X paid tiers**: Confirmed current pricing from developer.twitter.com
- **Salesforce 2–10 minute activation delay**: Documented in community reports and Trailhead

### What's source-supported but not personally tested
- Zoom, LinkedIn, Twitter/X review timelines (from developer docs and community reports)
- Specific scope restriction classifications

### What remains uncertain
- Exact CASA audit costs (range $4K–$75K+ widely reported but varies by assessor)
- Review timeline variations by season/team load

---

## Limitations

- Live generation accuracy depends on Gemini's ability to find current provider docs — APIs change
- Guide library represents a point-in-time snapshot (January 2025 verified)
- No automated re-verification of guide accuracy over time
- LinkedIn managed auth availability with Composio was not confirmed (marked accordingly)

---

## Repository Structure

```
apm-integration-composio/
├── README.md
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── agent/
│   │   └── researcher.py
│   └── guides/
│       ├── schema.py
│       └── library/
│           ├── github.json
│           ├── google.json
│           ├── slack.json
│           ├── notion.json
│           ├── salesforce.json
│           ├── linkedin.json
│           ├── twitter.json
│           ├── hubspot.json
│           ├── dropbox.json
│           ├── zoom.json
│           ├── microsoft.json
│           └── airtable.json
└── frontend/
    ├── package.json
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── guide/[slug]/page.tsx
    │   └── generate/page.tsx
    └── lib/
        ├── api.ts
        └── types.ts
```

---

## Credentials Policy

No OAuth credentials, API keys, or secrets are included in this repository.
The only credential needed at runtime is a `GEMINI_API_KEY` set in `backend/.env` (excluded from git via `.gitignore`).


---

## Deployment

**Backend → Render** (free tier; `render.yaml` included)
1. Render → New → Blueprint → select this repo.
2. Set `GEMINI_API_KEY` and `ALLOWED_ORIGINS` (your Vercel URL, no trailing slash).
3. Note the service URL, e.g. `https://oauth-guides-api.onrender.com`.

**Frontend → Vercel**
1. Import the repo, set **Root Directory** to `frontend`.
2. Add env var `NEXT_PUBLIC_API_URL` = the Render URL (no trailing slash).
3. Deploy, then put the Vercel URL into the backend's `ALLOWED_ORIGINS`.

Notes: the free Render tier sleeps when idle (first request ~30s) and its disk is ephemeral, so
live-generated guides saved to `guides/generated/` disappear on redeploy/restart.
