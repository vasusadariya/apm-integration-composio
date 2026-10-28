# OAuth Setup Guides

> **Composio APM Integrations take-home.** Look up any app and see what it takes to get an OAuth app set up and approved — difficulty, time, requirements, blockers, what an agent can do vs. what you must — or have an agent research an app that isn't in the library, live.

- **Live app:** https://oauthguide.vercel.app
- **API:** https://oauth-guides-api-u0ae.onrender.com (free tier: the first request after idle takes ~30 s)
- **Source:** https://github.com/vasusadariya/apm-integration-composio
- **Evidence:** [VERIFICATION.md](VERIFICATION.md) · **Full docs:** [docs/DETAILS.md](docs/DETAILS.md)

## The problem, and what I learned about it

An AI agent product lets its users connect apps (Gmail, Slack, Notion…) through OAuth. Each connection is made by an **end user**, but it goes through an **OAuth app that the developer registers with the provider** — the provider shows that app's name, logo and requested scopes on the consent screen, and decides how many users may use it and whether it must be reviewed first. Composio's *managed OAuth apps* let a developer prototype on Composio's own registered app; to launch under their own branding (or for providers Composio doesn't manage, such as X) they must create and, if required, get their own app approved.

That path varies enormously and is badly documented: GitHub is a form and an instant result, Slack needs distribution enabled, Figma and Notion review public apps, Google needs verification plus an annual security assessment for restricted scopes. Developers find out what is required **mid-launch**. So the product answers, before any work starts: *how hard is it, how long will I wait, what will block me, what can an agent do, and where do I take over?*

**Why this scope:** a deep, evidence-backed guide format that works for *any* app (one schema, a live research agent) matters more than a long list of shallow entries — so 17 verified apps across the difficulty range, plus live generation for everything else.

## What it does

1. **Guide library (17 apps, easy → very hard).** GitHub, Airtable, Linear, Discord, Asana, Slack, Notion, HubSpot, Dropbox, Microsoft, Figma, Zoom, Twitter/X, Salesforce, LinkedIn, Stripe, Google. Each guide has difficulty, setup time, approval wait, step-by-step walkthrough (with per-step "agent can do / you do"), a requirements checklist, blockers, **"your next step"**, **"if you get stuck"**, sources, a **"what was verified"** panel, and a **setup kit** (copy-paste values such as the redirect URI, a Slack app manifest with a prefilled create-app link, and a **live endpoint check** that tests the provider's real OAuth endpoints). Export as Markdown/JSON; share by link.
2. **Live generation.** Enter any app name/URL → a Gemini agent researches it with Google Search, streams real progress, produces a guide in the same format, and **tests** it (are the cited links reachable? does the provider publish OAuth discovery metadata?). Runs are resumable background jobs: refresh the page and you rejoin the same run.

## Try it (suggested demo)

| Try | What it shows |
|---|---|
| **GitHub** | Easy: one form, instant, no review |
| **Slack** | Medium: distribution rules, a setup kit with a Slack manifest, and the live endpoint check |
| **Google** | Very hard: verification + security assessment; what is *sourced* vs *not published* in the Verification panel |
| **Twitter/X** | A guide that was **corrected** against the docs (managed-auth flag, pricing, approval) |
| `/generate` → an unfamiliar app (e.g. "CareerPassport", "Shopify") | The live agent: streamed progress, sources, machine-checked links, shareable URL (refresh mid-run — it resumes) |

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

- **Focused slice: 17 apps + live generation**, not 100 shallow entries — the spread (GitHub in an hour vs. Google with a security assessment) shows the problem; unknown apps go through the agent.
- **One schema for everything** (Pydantic ↔ TypeScript). Library guides and generated guides render identically, so a developer never has to learn two formats.
- **Evidence is part of the product.** Every guide states its confidence and what was confirmed, corrected, or could not be verified. Generated guides can never be labelled "verified".
- **Flat JSON, no database.** Guides are reviewable, diffable and version-controlled; a wrong fact is a one-line PR.
- **Agent progress is real and bounded.** Streaming, per-attempt timeouts, fallback (grounded → ungrounded → next model), and replayable jobs so a refresh or flaky network never loses a run.
- **Shared links outlive the server.** Generated guides are saved on the server and also embedded in the share link, because the free host's disk is ephemeral.

## How agents are used

- **Research agent (Gemini + Google Search):** finds the developer portal, scopes, approval process and blockers; output is validated against the schema and capped at "source supported".
- **Testing, not just reading:** after generating, the agent fetches every URL it cites, probes OAuth discovery metadata, and live-tests the provider's real authorization/token endpoints with deliberately invalid requests.
- **Preparing the setup:** a setup kit with the values to paste (redirect URI, scopes, a Slack manifest, …). The agent cannot register apps for the developer — that needs their account and legal acceptance — so each step is marked *agent can do* or *you do*, and each guide ends with *your next step* and *if you get stuck*.
- **Transparency:** every guide shows confirmed / corrected / could-not-verify items and an agent log of what was actually done.

## Evidence (summary)

I read the official docs for 9 of the first 12 providers, plus the Composio managed-auth directory (checked for all 17), and compared them with the guides; the 5 later guides were written directly from the docs. It found real errors in my first draft — e.g. Twitter/X is **not** Composio-managed while LinkedIn **is**, X's pricing/approval description was outdated, Slack apps don't install in other workspaces without distribution, and several review timelines/costs aren't published anywhere official. All were corrected or flagged unverified, and confidence badges lowered accordingly (only GitHub is "verified").

| What I found | Was | Now |
|---|---|---|
| Twitter/X managed auth | "Available" | **Not** in Composio's managed list |
| LinkedIn managed auth | "Not available" | **Is** in the list |
| X access | Free/Basic $100/Pro $5,000 + manual approval | Self-serve console, pay-per-usage credits, no documented review |
| Slack installs | "Any app installs anywhere, no approval" | Only in its own workspace until distribution is enabled |
| Google cost/timeline | "$4K–$75K, 4–6 weeks" | Not published by Google — labelled community-reported/unverified |

Could not verify: Salesforce (help page failed to load), most review timelines, and anything that needs a signed-in provider console. Full record: [VERIFICATION.md](VERIFICATION.md).

## Limitations

- **Nothing was tested in real provider consoles.** I did not register OAuth apps; documentation was read via an automated fetch tool, so omissions are reported as "unverified".
- Salesforce, Microsoft and Airtable were not re-checked beyond the managed-auth flag (Salesforce's help page failed to load).
- The agent investigates, tests (links, OAuth discovery, live OAuth endpoints) and prepares a setup kit, but **it does not register apps or operate provider consoles** — that needs the developer's account. "Agent can do this" on a step is our assessment, not a tested capability.
- Generated guides are model-written and may be wrong; library apps typed into `/generate` return the stored guide unless you choose "Research live instead".
- Jobs and the per-IP rate limit are in memory (reset on restart); the free Render tier sleeps when idle.
- Provider processes change often; review timelines are mostly community-reported and labelled as such.

## Credentials

No secrets are committed. The only runtime secret is `GEMINI_API_KEY` (in `backend/.env` locally, or the host's environment), which is git-ignored.
