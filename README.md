# OAuth Setup Guides — an APM Integrations Platform

> **Composio take-home assignment.**
> A web app and AI research agent that tells a developer, *before* they start building, exactly what it takes to register, configure and get approved for an OAuth app with any third-party provider: how hard it is, how long approval takes, what the provider checks, what will block you, and what an agent can automate versus what a human must do.

---

## Table of contents

1. [The problem](#1-the-problem)
2. [What I built](#2-what-i-built)
3. [Feature tour](#3-feature-tour)
4. [Architecture](#4-architecture)
5. [Local setup (step by step)](#5-local-setup-step-by-step)
6. [Configuration reference](#6-configuration-reference)
7. [The guide library (12 apps)](#7-the-guide-library-12-apps)
8. [The guide schema](#8-the-guide-schema)
9. [The AI research agent](#9-the-ai-research-agent)
10. [API reference](#10-api-reference)
11. [Frontend design system](#11-frontend-design-system)
12. [Project structure](#12-project-structure)
13. [Testing](#13-testing)
14. [Deployment](#14-deployment)
15. [Key product decisions](#15-key-product-decisions)
16. [Evidence, accuracy and what was (not) verified](#16-evidence-accuracy-and-what-was-not-verified)
17. [Limitations and known issues](#17-limitations-and-known-issues)
18. [Out of scope (by design)](#18-out-of-scope-by-design)
19. [Troubleshooting](#19-troubleshooting)
20. [What I would build next](#20-what-i-would-build-next)
21. [Credentials policy](#21-credentials-policy)

---

## 1. The problem

When someone builds an AI agent (for example with Composio), their end users need to connect third-party apps such as Gmail, Slack, Notion or Salesforce. That connection happens over **OAuth** — the "Sign in with X" protocol.

Before any end user can connect, the *developer* must:

1. Register an OAuth app with the provider (Google, Slack, …).
2. Configure it (scopes, redirect URIs, branding).
3. Get it approved or verified by the provider.
4. Only then go live.

This process is wildly inconsistent between providers:

| Provider | Reality |
|---|---|
| GitHub | Self-service. Instant. About 30 minutes end to end. |
| Slack / Notion / HubSpot | A few hours of work plus an optional or short review. |
| LinkedIn | Access is split into *products* you must apply for; weeks. |
| Google (sensitive/restricted scopes) | Verification **plus** a third-party CASA security assessment — weeks and thousands of dollars. |

There is no single place to look this up. Developers piece together documentation, guess timelines and get blocked mid-launch by a requirement they didn't know existed (a privacy policy, a demo video, a paid plan, a security audit).

**This project is that single place.**

---

## 2. What I built

A full-stack application with two halves:

1. **A guide library** — 12 hand-structured, pre-built OAuth setup guides spanning the whole difficulty spectrum, from "done in an hour" to "budget six weeks".
2. **A live research agent** — type any app name (and optionally its URL) and a Gemini-powered agent searches the web, reads provider documentation, and streams back a guide in the *same structured format*, with sources.

Every guide answers the same questions:

- **Difficulty** — Easy / Medium / Hard / Very Hard
- **Time** — how long setup takes, and how long approval takes
- **Steps** — an ordered walkthrough with direct links, per-step time and warnings
- **Requirements** — account type, live website, privacy policy, terms of service, demo video, security audit, allowed and restricted scopes
- **Blockers** — severity-rated gotchas with workarounds
- **Agent vs. human** — which steps an AI agent can perform and which need a person
- **Evidence** — sources, a confidence level, and what the agent did to produce the guide

The agent is deliberately **transparent**: each guide shows what was researched, which sources back it up, and how confident the result is.

---

## 3. Feature tour

### Home page (`/`)
- Dark hero in the Composio visual language, animated "signal bar" backdrop, and a headline with a highlighted keyword.
- **Instant search** over the library. Press **`/`** anywhere to focus it; typing scrolls you to the results.
- **Difficulty filter** (All / Easy / Medium / Hard / Very Hard) with live counts.
- **App marquee** of every guide in the library (pauses on hover).
- **Stats strip** with count-up numbers (guides, ones needing review, ones done in an hour, ones with Composio managed auth).
- **Guide cards** showing a logo, difficulty badge, a 4-segment difficulty meter, summary, setup time, approval time, and a "Composio managed auth" tag. A pale-blue glow follows your cursor.
- **"Don't see your app?"** — an empty search result offers to generate a guide for exactly what you typed (`/generate?app=<query>`).

### Guide page (`/guide/[slug]`)
- **Hero** with the app, difficulty, confidence badge, summary and four headline metrics (setup time, approval wait, review required, agent automation).
- **Composio managed auth** callout when applicable.
- **Sticky section nav** with scroll-spy (Steps · Requirements · Blockers · Agent log · Sources) and an overall **progress bar**.
- **Key facts** panel.
- **Step-by-step timeline** — each step is collapsible, shows whether the *agent can do it* or *you do it*, an estimated time, a deep link to the provider page, and warnings. Click the step number to **mark it done**; progress is remembered per guide in your browser.
- **Requirements checklist** — each *required* item is a real checkbox you can tick off (remembered per guide). Allowed and restricted scopes are listed as chips.
- **Blockers & gotchas** — colour-coded by severity (blocking / warning / info) with workarounds.
- **Agent log** — a terminal-style record of what the agent investigated and the outcome of each action.
- **Sources** — every link, labelled *Official docs*, *Community* or *Inferred*.
- **Share** button copies the guide's URL.

### Live generation page (`/generate`)
- App name + optional website; one-click **example chips** (Stripe, Figma, Shopify, Asana, Linear, Discord).
- **Streaming terminal** showing the agent's progress as it works, with an elapsed-time counter and an indeterminate progress bar.
- On completion the page switches to the full guide view with a banner linking to its **permanent shareable URL** (`/guide/<slug>`).
- Clear, actionable error messages (missing API key, rate limits, backend down).

### Polish
- Scroll-reveal animations, page-transition fades, hover and press micro-interactions.
- Responsive down to phone width with a mobile menu.
- Respects `prefers-reduced-motion`.
- Skeleton loading states and friendly 404 / error views.

---

## 3a. Success criteria from the assignment — status

| Criterion | Status |
|---|---|
| Developer can look up an app → get a guide → share it | ✅ Search/filter → guide page → **Share** button / permanent URL |
| Developer knows difficulty, time estimate, requirements, blockers | ✅ Hero metrics, requirements checklist, blockers section |
| Agent investigates and generates for unknown apps in real time | ✅ `/generate` streams SSE progress and a structured guide |
| Varied app showcase (easy → very hard) | ✅ 12 apps: 2 easy, 5 medium, 4 hard, 1 very hard |
| Clear about what the agent tested vs. what sources support vs. what is uncertain | ✅ Confidence badge, source types, agent log, and honest limitations (§16–17) |
| README with setup, decisions, limitations | ✅ This document |
| No credentials in submission | ✅ `.env` is git-ignored; only `.env.example` is committed |

---

## 4. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND  (Next.js 15, React 19)          │
│  /               Library: search, filters, cards            │
│  /guide/[slug]   Guide page (library OR generated guide)    │
│  /generate       Live generation with streamed agent log    │
└───────────────────────────┬─────────────────────────────────┘
                            │ REST (JSON)  +  SSE (POST stream)
┌───────────────────────────▼─────────────────────────────────┐
│                   BACKEND  (FastAPI, Python)                │
│                                                             │
│  main.py                                                    │
│    GET  /api/guides         list library summaries          │
│    GET  /api/guides/{slug}  library OR generated guide      │
│    GET  /api/search?q=      filter by name / domain         │
│    POST /api/generate       SSE stream of agent progress    │
│                                                             │
│  agent/researcher.py   Gemini + Google Search grounding     │
│  guides/schema.py      Pydantic model (single source of     │
│                        truth for guide structure)           │
│  guides/library/*.json 12 pre-built guides (version-        │
│                        controlled)                          │
│  guides/generated/     cache of live-generated guides       │
│                        (git-ignored)                        │
└─────────────────────────────────────────────────────────────┘
```

### Request flow: live generation

1. The browser `POST`s `{app_name, website_url?}` to `/api/generate`. The backend validates the API key, starts a **background job** (at most 2 research runs at once; others wait their turn) and returns a `job_id`. The frontend puts it in the URL (`/generate?job=…`).
2. The browser opens `GET /api/jobs/{id}/events` (SSE). The server **replays every recorded event**, then follows the job live. Refresh the page, or reopen the URL, and the same run is rebuilt from the replay.
3. **Cached or library fast path** — a previously generated guide, or a match with a pre-built library guide (e.g. "Gmail", "azure", "x"), is returned immediately. This is a shortcut, not live research (see §17).
4. **Research path** — otherwise Gemini is called in a worker thread, **streaming**, with Google Search grounding. Progress lines report real facts (attempt number, characters received, web sources found). Every attempt is **time-bounded** (60 s to first token, 30 s idle, 110 s max; 200 s total). If grounded search stalls or fails, it automatically falls back to ungrounded generation, then to the next model.
5. The output is **parsed**, **normalised**, **merged** with the sources Gemini consulted, and **validated** against the Pydantic `OAuthGuide` schema. A malformed result moves on to the next attempt.
6. A guide claiming `"verified"` is downgraded to `"source_supported"`.
7. The guide is **saved** to `backend/guides/generated/<slug>.json` and emitted as a `guide` event, followed by `done`. Friendly messages are produced for invalid key, rate limit (429) and overload (503).
8. The frontend renders it with the same `GuideDetail` component as library guides and links to `/guide/<slug>`.

### SSE event types

| Event `type` | Payload | Meaning |
|---|---|---|
| `status` | `{message}` | A progress line for the terminal log |
| `guide` | `{data: OAuthGuide}` | The finished guide |
| `done` | `{message}` | Stream finished successfully |
| `error` | `{message}` | Something failed (friendly message) |
| `raw` | `{text}` | Unparseable model output, for debugging |

---

## 5. Local setup (step by step)

### Prerequisites

| Tool | Version | Check with |
|---|---|---|
| Python | 3.11 or newer | `python3 --version` |
| Node.js | 18.18 or newer (20+ recommended) | `node --version` |
| npm | comes with Node | `npm --version` |
| Gemini API key | free | https://aistudio.google.com/app/apikey |

> The **library works without an API key**. You only need a key for live generation of apps that are not in the library.

### Step 1 — Get the code

```bash
git clone https://github.com/vasusadariya/apm-integration-composio.git
cd apm-integration-composio
```

### Step 2 — Get a Gemini API key

1. Open https://aistudio.google.com/app/apikey and sign in.
2. Click **Create API key** and copy it.

### Step 3 — Set up and start the backend (Terminal 1)

```bash
cd backend
python3 -m venv venv
```

Activate the virtual environment:

```bash
# macOS / Linux
source venv/bin/activate
```

```powershell
# Windows (PowerShell)
venv\Scripts\Activate.ps1
```

Install dependencies and create your env file:

```bash
pip install -r requirements.txt
cp .env.example .env
```

Open `backend/.env` and set your key:

```env
GEMINI_API_KEY=your_real_key_here
```

Start the API:

```bash
uvicorn main:app --reload --port 8000
```

Verify it works — open http://localhost:8000/api/guides. You should see JSON for 12 guides. Interactive API docs are at http://localhost:8000/docs.

### Step 4 — Set up and start the frontend (Terminal 2)

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

> `--legacy-peer-deps` avoids peer-dependency conflicts between React 19 and some tooling.

Open **http://localhost:3000**. The library should appear immediately.

### Step 5 — Try it

1. Browse the library, filter by difficulty, open **Google** to see a "Very Hard" guide.
2. Tick off a requirement and mark a step done; refresh — your progress is remembered.
3. Go to **/generate**, click **Stripe**, and watch the agent work.
4. When it finishes, click **Open shareable page** and copy the URL.

### One-command alternative

From the repository root (macOS / Linux / Git Bash):

```bash
./start.sh
```

It creates the venv, installs dependencies, copies `.env.example` if needed, and starts both servers. Remember to put your key in `backend/.env`.

### Pointing the frontend at a different backend

The frontend talks to `http://localhost:8000` by default. To change it, create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 6. Configuration reference

### Backend (`backend/.env`)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `GEMINI_API_KEY` | For live generation | — | Google AI Studio key. The placeholder value `your_gemini_api_key_here` is rejected with a clear error. |
| `GEMINI_MODEL` | No | cascade (below) | Preferred model. It is tried first, then the fallbacks. |
| `ALLOWED_ORIGINS` | In production | `*` | Comma-separated list of frontend origins allowed by CORS. |

**Model cascade:** `GEMINI_MODEL` (if set) → `gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-flash-latest`. For each model the agent first tries **with** Google Search grounding, and only if that fails (quota, unsupported model) retries **without** it.

The key is re-read from `.env` on every request, so you can fix it without restarting the server.

### Frontend (`frontend/.env.local`)

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Base URL of the backend API |

---

## 7. The guide library (12 apps)

Chosen to demonstrate the **full spectrum** of difficulty, not to be exhaustive.

| App | Difficulty | Setup time | Approval time | Review required | Composio managed auth | Confidence |
|---|---|---|---|---|---|---|
| GitHub | 🟢 Easy | 30–60 minutes | Instant | No | Yes | Verified |
| Airtable | 🟢 Easy | 30–60 minutes | Instant | No | Yes | Verified |
| Slack | 🟡 Medium | 1–2 hours | 1–7 days | No (optional listing) | Yes | Verified |
| Notion | 🟡 Medium | 1–3 hours | 1–5 business days | Yes | Yes | Verified |
| HubSpot | 🟡 Medium | 1–2 hours | 2–5 business days | No | Yes | Verified |
| Dropbox | 🟡 Medium | 1–2 hours | 1–5 business days | Yes | Yes | Verified |
| Microsoft | 🟡 Medium | 1–3 hours | Instant (personal); 2–5 days (org access) | No | Yes | Verified |
| Zoom | 🟠 Hard | 2–4 hours | 3–10 business days | Yes | Yes | Source supported |
| Twitter / X | 🟠 Hard | 1–3 hours | 1–5 business days | Yes | Yes | Source supported |
| Salesforce | 🟠 Hard | 3–6 hours | 1–3 weeks | No | Yes | Verified |
| LinkedIn | 🟠 Hard | 2–4 hours | 1–4 weeks | Yes | **No** (not confirmed) | Source supported |
| Google (Gmail / Drive / Calendar) | 🔴 Very Hard | 4–8 hours of active work | 4–6 weeks | Yes | Yes | Verified |

Each guide contains 4–8 steps, 1–3 blockers and 1–3 sources. They are plain JSON files in `backend/guides/library/` — easy to read, diff, review and correct.

### Why the "hard" ones are hard

- **Google** — requesting any *restricted* scope (e.g. full Gmail or Drive) puts the app on the verification track and triggers a CASA Tier 2 security assessment by an approved third-party assessor. Costs are widely reported in the thousands of dollars (a range of roughly $4K–$75K appears in sources and varies by assessor and app).
- **LinkedIn** — a Company Page is required to create an app, and meaningful API access is gated behind separately-approved *products*.
- **Twitter / X** — meaningful API access requires a paid tier.
- **Salesforce** — multi-instance URLs (login vs. sandbox vs. custom domain) and a longer path to marketplace distribution.
- **Zoom** — publishing to the Marketplace requires Zoom's review.

---

## 8. The guide schema

Every guide — library or generated — conforms to one Pydantic model (`backend/guides/schema.py`), mirrored by TypeScript types in `frontend/lib/types.ts`.

```ts
interface OAuthGuide {
  app: string;                      // "GitHub"
  slug: string;                     // "github"  (URL: /guide/github)
  website: string;                  // "github.com"
  logo_url: string;
  generated_at: string;             // ISO timestamp

  difficulty: "easy" | "medium" | "hard" | "very_hard";
  setup_time_estimate: string;      // "30–60 minutes"
  approval_time_estimate: string;   // "Instant" | "1–5 business days" | …
  requires_approval: boolean;
  composio_managed_auth: boolean;

  summary: string;                  // 2–3 sentence overview
  key_facts: string[];

  steps: Step[];
  requirements: Requirements;
  blockers: Blocker[];
  agent_actions: AgentAction[];     // what the agent did
  sources: Source[];
  confidence: "verified" | "source_supported" | "inferred" | "uncertain";
  last_verified: string;            // YYYY-MM-DD
}

interface Step {
  number: number;
  title: string;
  description: string;
  agent_can_do: boolean;            // can an agent perform this step?
  estimated_time: string;
  url?: string;                     // deep link to the provider page
  warnings: string[];
}

interface Requirements {
  account_type: string;
  needs_live_website: boolean;
  needs_privacy_policy: boolean;
  needs_terms_of_service: boolean;
  needs_video_demo: boolean;
  needs_security_audit: boolean;
  allowed_scopes: string[];
  restricted_scopes: string[];
}

interface Blocker {
  title: string;
  description: string;
  severity: "blocking" | "warning" | "info";
  workaround?: string;
}

interface AgentAction { action: string; result: string; status: "done" | "partial" | "blocked"; }
interface Source { title: string; url: string; type: "official_docs" | "community" | "inferred"; }
```

### Confidence levels

| Level | Meaning |
|---|---|
| `verified` | Backed by the provider's official documentation (library guides only). |
| `source_supported` | Supported by sources found, but not cross-checked end to end. The highest level a **generated** guide can have. |
| `inferred` | Reasonable conclusion from related information, not stated directly. |
| `uncertain` | The agent could not find reliable information. |

---

## 9. The AI research agent

Implemented in `backend/agent/researcher.py` using the `google-genai` SDK.

**What it is asked to do** (see `SYSTEM_INSTRUCTION` and `GUIDE_PROMPT_TEMPLATE`):

1. Find the provider's developer portal.
2. Find the OAuth app registration flow, with exact UI navigation.
3. List scopes/permissions and which are restricted.
4. Determine whether approval or review is needed, who reviews, and how long it takes.
5. Identify prerequisites (website, privacy policy, paid plan, audit).
6. Identify blockers and community-reported gotchas.
7. Check whether the app is covered by Composio managed auth.
8. Return **only** a JSON object matching the schema, citing sources, and be honest about uncertainty.

**How it stays trustworthy**

| Mechanism | What it does |
|---|---|
| **Google Search grounding** | Gemini searches the live web; the pages it consulted are read from the response's grounding metadata and appended to the guide's `sources`. |
| **Source classification** | Grounded URLs containing `docs`, `developer` or `api.` are labelled *Official docs*; the rest *Community*. |
| **Schema validation** | Output is validated by Pydantic; malformed guides produce a clear error rather than rendering garbage. |
| **Robust JSON extraction** | Handles Markdown fences or prose around the JSON. |
| **Confidence cap** | A generated guide can never be labelled `verified`. |
| **Graceful degradation** | If search grounding or a model fails, it retries without grounding and tries the next model. |
| **Friendly errors** | Invalid key, rate limit (429) and parse failures each produce a specific message. |

---

## 10. API reference

Base URL (local): `http://localhost:8000` · Interactive docs: `/docs`

### `GET /`
Health check → `{"status": "ok", "version": "1.0.0"}`

### `GET /api/guides`
Summary cards for every library guide (`app, slug, website, logo_url, difficulty, setup_time_estimate, approval_time_estimate, requires_approval, composio_managed_auth, summary, confidence`).

### `GET /api/guides/{slug}`
Full guide. Looks in the library first, then in `guides/generated/`. The slug must match `[a-z0-9-]+`; anything else (including path-traversal attempts) returns `404`.

### `GET /api/search?q=<text>`
Case-insensitive match on app name or website. An empty `q` returns everything.

### `POST /api/generate`
Starts (or rejoins) a background research job and returns `{job_id, reused, status}`. Asking for the same app twice reuses the running/finished job. Body:
```json
{ "app_name": "Stripe", "website_url": "https://stripe.com" }
```
Returns `400` with a helpful message if `GEMINI_API_KEY` is missing or still the placeholder.

### `GET /api/jobs/{job_id}`
Job status (`running` / `done` / `error`) and event count. `404` if the session expired.

### `GET /api/jobs/{job_id}/events`
`text/event-stream` that **replays every event from the start (or from `?start=N` / the `Last-Event-ID` header)** and then follows the job live, with keep-alive comments. This is what lets a refreshed page resume exactly where it was. Event types are listed in §4.

Example with curl:
```bash
curl -X POST http://localhost:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"app_name": "Stripe"}'
# → {"job_id":"abc123…","reused":false,"status":"running"}
curl -N http://localhost:8000/api/jobs/abc123…/events
```

---

## 11. Frontend design system

The UI follows the Composio website's visual language.

| Element | Choice |
|---|---|
| Hero | Near-black `#0a0a0a`, animated multi-colour signal bars, faint grid |
| Accent | Electric blue `#1a1aff`, used for highlights, links and focus |
| Body | White, with pale-blue gradient cards (`#e9f6ff → #d7ecff`) |
| Headings | Inter, tight letter-spacing (`-0.03em`) |
| Buttons and labels | JetBrains Mono, **uppercase**, square corners, 1px border, arrow that nudges on hover |
| Difficulty colours | Easy = green, Medium = amber, Hard = orange, Very Hard = red |

**Motion:** staggered hero entrance, scroll reveals (IntersectionObserver), spotlight hover on cards, marquee, count-up stats, collapsible steps (CSS grid-rows transition), terminal line-in animation, indeterminate progress bar, page transitions (`app/template.tsx`). All disabled under `prefers-reduced-motion`.

**Persistence:** requirement ticks and step completion are stored per guide in `localStorage` (`checklist:<slug>`). The app works if storage is unavailable.

---

## 12. Project structure

```
apm-integration-composio/
├── README.md
├── render.yaml                     # Render blueprint for the backend
├── start.sh                        # one-command local start
├── .env.example
├── backend/
│   ├── main.py                     # FastAPI app: routes, CORS, SSE
│   ├── requirements.txt
│   ├── .env.example
│   ├── test_api.py                 # API + schema + normalisation tests
│   ├── agent/
│   │   └── researcher.py           # Gemini agent, JSON parsing, normalisation, caching
│   └── guides/
│       ├── schema.py               # Pydantic models
│       ├── library/                # 12 pre-built guides (JSON)
│       └── generated/              # live-generated guides (git-ignored)
└── frontend/
    ├── package.json
    ├── tailwind.config.js          # brand palette, fonts, keyframes
    ├── app/
    │   ├── layout.tsx              # fonts, navbar, footer
    │   ├── template.tsx            # page transition
    │   ├── globals.css             # tokens, buttons, spotlight, reveal
    │   ├── page.tsx                # home: hero, search, filters, library
    │   ├── guide/[slug]/page.tsx   # guide page (loads from API)
    │   └── generate/page.tsx       # live generation UI
    ├── components/
    │   ├── GuideDetail.tsx         # shared full-guide renderer
    │   ├── DifficultyBadge.tsx     # badge + 4-segment meter
    │   ├── GlitchBars.tsx          # animated hero backdrop
    │   ├── Navbar.tsx  Footer.tsx  Logo.tsx
    │   ├── AppLogo.tsx             # logo with letter fallback
    │   ├── Reveal.tsx              # scroll-reveal wrapper
    │   └── CountUp.tsx             # animated numbers
    └── lib/
        ├── api.ts                  # API client
        └── types.ts                # TypeScript guide types
```

---

## 13. Testing

Backend tests cover: health check, listing, retrieving guides (GitHub, Google), 404 handling, search (with and without a query), schema validation of every library file, guide normalisation (slug, confidence cap, source merging, fenced JSON) and slug-traversal rejection.

```bash
cd backend
source venv/bin/activate
python -m unittest test_api
```

Frontend checks:

```bash
cd frontend
npx tsc --noEmit     # type check
npm run lint         # ESLint
npm run build        # production build
```

---

## 14. Deployment

**Backend → Render (free tier; `render.yaml` included)**
1. Render → New → Blueprint → select this repository.
2. Set `GEMINI_API_KEY` and `ALLOWED_ORIGINS` (your Vercel URL, no trailing slash).
3. Note the service URL, e.g. `https://oauth-guides-api.onrender.com`.

**Frontend → Vercel**
1. Import the repository and set **Root Directory** to `frontend`.
2. Add `NEXT_PUBLIC_API_URL` = the Render URL (no trailing slash).
3. Deploy, then put the Vercel URL into the backend's `ALLOWED_ORIGINS`.

Notes: the free Render tier sleeps when idle (first request can take ~30 s) and its disk is ephemeral, so live-generated guides saved to `guides/generated/` disappear on restart or redeploy. The 12 library guides live in git and are unaffected.

---

## 15. Key product decisions

**Why JSON files instead of a database?**
Guides are semi-static reference content. JSON is portable, version-controlled, diff-friendly and zero-infrastructure; a wrong fact can be fixed in a pull request. It can be migrated to a database later if write volume or multi-user features demand it.

**Why not just a static site?**
Live generation needs a backend that can call an AI model with secrets. The hybrid gives instant library pages and dynamic capability for everything else.

**Why 12 apps instead of 100?**
The assignment asks to demonstrate a few varied apps. A small, *well-structured* set that covers the full difficulty range shows the product better than a long list of shallow entries.

**Why stream the agent's progress?**
Transparency is the point of the product. Developers should see what the agent is doing rather than receive a black-box result. Streaming also makes a 20–60 second task feel active.

**Why SSE over WebSockets?**
One-directional server→client updates are all that's needed. SSE is plain HTTP, simple, and proxies well. (The frontend uses `fetch` + a stream reader rather than `EventSource` because the request is a `POST`.)

**Why Gemini with Google Search grounding?**
The task is synthesising scattered, changing documentation into a fixed schema. An LLM with live search handles that better than per-provider scrapers, and grounding metadata gives real citations.

**Why cache generated guides to disk?**
It makes a generated guide *shareable* — the same `/guide/<slug>` route serves both library and generated guides — without introducing a database.

**Why cap generated confidence below "verified"?**
An AI-written guide that nobody has cross-checked should not carry the same badge as a reviewed one.

---

## 16. Evidence, accuracy and what was (not) verified

I want to be explicit about what each claim rests on.

**Library guides (12):**
- Written and structured by hand from the providers' public developer documentation and widely reported community knowledge, with `last_verified` set to **2025-01-15**.
- Each carries 1–3 source links. Guides labelled `verified` were written against official docs; those labelled `source_supported` (Zoom, Twitter/X, LinkedIn) rest on docs plus community reports and are flagged as less certain.
- **I did not register real OAuth apps with these providers to test the flows**, and I did not independently re-check each link and figure after writing. Treat timelines and costs as informed estimates.
- The `agent_can_do` flag on each step is a judgement about whether an automated agent could realistically perform that step (most steps need a human because they involve logging into a provider console or accepting legal terms).

**Generated guides:**
- Produced by Gemini with Google Search grounding, schema-validated, and capped at `source_supported`.
- The sources shown are the pages the search tool actually returned, but the *content* of the guide is model-written and may contain errors. Always verify against the provider's docs.

**Known-uncertain items:**
- Exact CASA assessment cost (reported anywhere from about $4K to $75K+, varying by assessor and app).
- Review durations, which vary with provider queue and season.
- Whether LinkedIn is covered by Composio managed auth (marked `false` because it was not confirmed).

---

## 17. Limitations and known issues

- **Accuracy is point-in-time.** Provider consoles and policies change often. Library guides reflect January 2025 knowledge and have no automated re-verification.
- **Generated quality varies.** Obscure providers with thin documentation produce lower-confidence guides.
- **Library shortcut in `/generate`.** If the name matches a library app (including aliases like "Gmail", "Azure", "X"), the stored guide is returned with simulated progress messages rather than a fresh research run. This is faster and more accurate, but it is not live research.
- **Generated guides are not durable on free hosting** (ephemeral disk). Use a persistent disk or database for long-lived share links.
- **No rate limiting or auth** on `/api/generate`; a public deployment could burn through the Gemini quota. Add rate limiting before exposing it widely.
- **Progress is real but coarse.** Status lines report actual attempts, character counts and the number of web sources found while the model streams; they are not a per-tool-call trace.
- **Jobs live in server memory.** A refresh resumes the same run, but if the server restarts the session is gone and the user must generate again (finished guides are cached on disk).
- **Checklist progress is per-browser** (`localStorage`), not synced across devices.
- **Logos** come from favicon services; some may fail and fall back to a letter tile.

---

## 18. Out of scope (by design)

- No real OAuth credentials are created, stored or handled.
- No provider accounts are created or logged into by the agent.
- No database or user accounts.
- No 100-app library.
- No automated re-verification pipeline.

---

## 19. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Home page says it can't connect to the guide API | Backend isn't running. Start it: `cd backend && uvicorn main:app --reload --port 8000`. |
| `GEMINI_API_KEY is not configured` | Put your key in `backend/.env` (not the placeholder). No restart needed. |
| "Gemini API rate limit reached" | Free-tier quota; wait a few seconds and retry. |
| `cd: no such file or directory: backend` | You're already inside `backend`; run commands from the repo root. |
| `npm install` peer-dependency errors | Use `npm install --legacy-peer-deps`. |
| Port 3000/8000 already in use | Stop the other process, or run on another port (`npm run dev -- -p 3001`, `uvicorn … --port 8001`) and update `NEXT_PUBLIC_API_URL`. |
| CORS error in production | Set the backend's `ALLOWED_ORIGINS` to the exact frontend origin (no trailing slash). |
| Hydration warning in dev | Hard-refresh; if it persists, try a private window to rule out browser extensions. |
| Styling looks missing after rebuilding | Stop the dev server, delete `frontend/.next`, restart. |

---

## 20. What I would build next

- Periodic **re-verification** of library guides (link checks, diffing against provider docs).
- A **persistent store** for generated guides, with edit/approve flow to promote a good generated guide into the library.
- **Rate limiting** and optional auth on generation.
- More providers, and a contribution template for adding a guide via pull request.
- Machine-readable **export** (JSON / Markdown) of any guide, and an API for agents to consume guides directly.
- True **tool-level agent traces** (each search/fetch as a streamed event).
- Composio integration: link each guide to a managed-auth toolkit or a "bring your own credentials" flow.

---

## 21. Credentials policy

No OAuth credentials, API keys or secrets are included in this repository. The only runtime secret is `GEMINI_API_KEY`, read from `backend/.env`, which is excluded from git by `.gitignore`. Only `.env.example` files (with placeholders) are committed.
