# OAuth Setup Guides

> **Composio APM Integrations take-home.** Look up any app and see what it takes to get an OAuth app set up and approved — difficulty, time, requirements, blockers, what an agent can do vs. what you must — or have an agent research an app that isn't in the library, live.

- **Live app:** https://oauthguide.vercel.app
- **API:** https://oauth-guides-api-u0ae.onrender.com (free tier: the first request after idle takes ~30 s)
- **Evidence:** [VERIFICATION.md](VERIFICATION.md) · **Full docs:** [docs/DETAILS.md](docs/DETAILS.md)

## What it does

1. **Guide library (12 apps, easy → very hard).** GitHub, Airtable, Slack, Notion, HubSpot, Dropbox, Microsoft, Zoom, Twitter/X, Salesforce, LinkedIn, Google. Each guide has difficulty, setup time, approval wait, step-by-step walkthrough (with per-step "agent can do / you do"), a requirements checklist, blockers, **"your next step"**, **"if you get stuck"**, sources, and a **"what was verified"** panel. Export as Markdown/JSON; share by link.
2. **Live generation.** Enter any app name/URL → a Gemini agent researches it with Google Search, streams real progress, produces a guide in the same format, and **tests** it (are the cited links reachable? does the provider publish OAuth discovery metadata?). Runs are resumable background jobs: refresh the page and you rejoin the same run.

## Run locally

Needs Python 3.11+, Node 18.18+, and (for live generation only) a free [Gemini API key](https://aistudio.google.com/app/apikey). The library works without a key.

```bash
git clone https://github.com/vasusadariya/apm-integration-composio.git
cd apm-integration-composio/backend
python3 -m venv venv && source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                   # then set GEMINI_API_KEY
uvicorn main:app --reload --port 8000
```

In a second terminal:

```bash
cd apm-integration-composio/frontend
npm install --legacy-peer-deps
npm run dev
```

Open http://localhost:3000. Tests: `cd backend && python -m unittest test_api`. One-command alternative: `./start.sh`. Deployment (Render + Vercel) and all configuration: [docs/DETAILS.md](docs/DETAILS.md#14-deployment).

## Key decisions

- **Focused slice: 12 apps + live generation**, not 100 shallow entries — the spread (GitHub in an hour vs. Google with a security assessment) shows the problem; unknown apps go through the agent.
- **One schema for everything** (Pydantic ↔ TypeScript). Library guides and generated guides render identically, so a developer never has to learn two formats.
- **Evidence is part of the product.** Every guide states its confidence and what was confirmed, corrected, or could not be verified. Generated guides can never be labelled "verified".
- **Flat JSON, no database.** Guides are reviewable, diffable and version-controlled; a wrong fact is a one-line PR.
- **Agent progress is real and bounded.** Streaming, per-attempt timeouts, fallback (grounded → ungrounded → next model), and replayable jobs so a refresh or flaky network never loses a run.
- **Shared links outlive the server.** Generated guides are saved on the server and also embedded in the share link, because the free host's disk is ephemeral.

## Evidence (summary)

I read the official docs for 10 of the 12 providers and the Composio managed-auth directory and compared them with the guides. It found real errors in my first draft — e.g. Twitter/X is **not** Composio-managed while LinkedIn **is**, X's pricing/approval description was outdated, Slack apps don't install in other workspaces without distribution, and several review timelines/costs aren't published anywhere official. All were corrected or flagged unverified, and confidence badges lowered accordingly. Details: [VERIFICATION.md](VERIFICATION.md).

## Limitations

- **Nothing was tested in real provider consoles.** I did not register OAuth apps; documentation was read via an automated fetch tool, so omissions are reported as "unverified".
- Salesforce, Microsoft and Airtable were not re-checked beyond the managed-auth flag.
- The agent investigates and tests links/discovery endpoints but **does not perform provider setup**; "agent can do this" on a step is our assessment, not a tested capability.
- Generated guides are model-written and may be wrong; library apps typed into `/generate` return the stored guide unless you choose "Research live instead".
- Jobs and the per-IP rate limit are in memory (reset on restart); the free Render tier sleeps when idle.
- Provider processes change often; review timelines are mostly community-reported and labelled as such.

## Credentials

No secrets are committed. The only runtime secret is `GEMINI_API_KEY` (in `backend/.env` locally, or the host's environment), which is git-ignored.
