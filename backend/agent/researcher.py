"""
OAuth Guide Research Agent using Google Gemini.
Investigates a given app/URL and generates a structured OAuth setup guide.
"""
import json
import os
import asyncio
import re
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Awaitable, Callable

from agent.probe import probe_guide
import google.genai as genai
from google.genai import types

SYSTEM_INSTRUCTION = """You are an expert OAuth integration researcher. 
Your job is to investigate a given app or service and produce a comprehensive, accurate guide 
for developers who want to set up an OAuth app with that provider.

Focus on:
1. The provider's developer portal URL
2. How to register an OAuth app (step-by-step with exact UI instructions)
3. What scopes/permissions exist and which are restricted
4. Whether app approval/review is required and how long it takes
5. What prerequisites exist (website, privacy policy, paid plan, etc.)
6. Known blockers, gotchas, and community-reported issues

Be honest about uncertainty. If you can't find something, say so.
Always cite your sources.
"""

GUIDE_PROMPT_TEMPLATE = """Research the OAuth app setup process for: {app_name}
{website_hint}

Investigate and produce a complete JSON guide with this EXACT structure:

{{
  "app": "<full app name>",
  "slug": "<lowercase-hyphenated>",
  "website": "<domain only>",
  "logo_url": "<favicon or logo URL>",
  "generated_at": "<ISO timestamp>",
  "difficulty": "<easy|medium|hard|very_hard>",
  "setup_time_estimate": "<e.g. '30-60 minutes'>",
  "approval_time_estimate": "<e.g. 'Instant' or '1-5 business days'>",
  "requires_approval": <true|false>,
  "composio_managed_auth": <true|false - check if listed at docs.composio.dev/toolkits/managed-auth>,
  "summary": "<2-3 sentence plain English overview of the OAuth setup path>",
  "key_facts": ["<bullet fact 1>", "...up to 8 facts"],
  "steps": [
    {{
      "number": 1,
      "title": "<step title>",
      "description": "<detailed description with exact UI navigation>",
      "agent_can_do": <true if an AI agent can do this automatically, false if human required>,
      "estimated_time": "<time for this step>",
      "url": "<direct URL if applicable>",
      "warnings": ["<warning if any>"]
    }}
  ],
  "requirements": {{
    "account_type": "<what account is needed>",
    "needs_live_website": <true|false>,
    "needs_privacy_policy": <true|false>,
    "needs_terms_of_service": <true|false>,
    "needs_video_demo": <true|false>,
    "needs_security_audit": <true|false>,
    "allowed_scopes": ["<scope1>", "..."],
    "restricted_scopes": ["<scope1>", "..."]
  }},
  "blockers": [
    {{
      "title": "<blocker name>",
      "description": "<what it is and why it blocks>",
      "severity": "<blocking|warning|info>",
      "workaround": "<how to handle it>"
    }}
  ],
  "agent_actions": [
    {{
      "action": "<what the agent investigated>",
      "result": "<what it found>",
      "status": "<done|partial|blocked>"
    }}
  ],
  "sources": [
    {{
      "title": "<page title>",
      "url": "<actual URL visited>",
      "type": "<official_docs|community|inferred>"
    }}
  ],
  "confidence": "<source_supported|inferred|uncertain>",
  "last_verified": "<YYYY-MM-DD>",
  "next_step": "<one sentence: the very first thing the developer should do right now>",
  "if_blocked": [
    {{
      "situation": "<a likely problem, e.g. review rejected or stuck>",
      "action": "<concrete next action: who to contact, what to change, or which alternative to use>",
      "url": "<support or docs URL if known, else omit>"
    }}
  ]
}}

Provide 2-3 if_blocked entries. Only state review timelines or prices if a source states them; otherwise say they are not published. Return ONLY the JSON object, no markdown fences, no extra text.
"""

LIBRARY_DIR = Path(__file__).parent.parent / "guides" / "library"
GENERATED_DIR = Path(__file__).parent.parent / "guides" / "generated"

DEFAULT_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"]


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "app"


def extract_json(text: str) -> dict:
    """Parse a JSON object out of model output, tolerating fences and prose."""
    text = text.strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise json.JSONDecodeError("No JSON object found", text, 0)
    return json.loads(text[start : end + 1])


def normalize_guide(data: dict, app_name: str, grounded_sources: list[dict]) -> dict:
    """Coerce model output to the OAuthGuide schema and merge grounding sources."""
    from guides.schema import OAuthGuide

    data["slug"] = slugify(data.get("slug") or data.get("app") or app_name)
    data["generated_at"] = datetime.now(timezone.utc).isoformat()
    data.setdefault("last_verified", datetime.now(timezone.utc).date().isoformat())
    data.setdefault("logo_url", f"https://www.google.com/s2/favicons?domain={data.get('website', '')}&sz=128")
    for step in data.get("steps", []):
        step["warnings"] = step.get("warnings") or []
        step["url"] = step.get("url") or None
    seen = {s.get("url") for s in data.get("sources", [])}
    for src in grounded_sources:
        if src["url"] not in seen:
            data.setdefault("sources", []).append(src)
            seen.add(src["url"])
    data.pop("verification", None)  # only machine checks (agent/probe.py) may populate this
    data["if_blocked"] = [b for b in data.get("if_blocked", []) if isinstance(b, dict) and b.get("situation") and b.get("action")]
    for b in data["if_blocked"]:
        b["url"] = b.get("url") or None
    # Never claim "verified" for an AI-generated guide.
    if data.get("confidence") == "verified":
        data["confidence"] = "source_supported"
    return OAuthGuide(**data).model_dump()


def save_generated_guide(guide: dict) -> None:
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    (GENERATED_DIR / f"{guide['slug']}.json").write_text(json.dumps(guide, indent=2))


def find_matching_library_guide(app_name: str) -> dict | None:
    """Check if app name closely matches any pre-verified guide in the library."""
    clean = app_name.lower().strip()
    slug_map = {
        "github": "github",
        "git hub": "github",
        "google": "google",
        "gmail": "google",
        "drive": "google",
        "google drive": "google",
        "slack": "slack",
        "notion": "notion",
        "salesforce": "salesforce",
        "linkedin": "linkedin",
        "twitter": "twitter",
        "x": "twitter",
        "twitter/x": "twitter",
        "hubspot": "hubspot",
        "dropbox": "dropbox",
        "zoom": "zoom",
        "microsoft": "microsoft",
        "azure": "microsoft",
        "outlook": "microsoft",
        "airtable": "airtable",
    }
    matched_slug = slug_map.get(clean)
    if matched_slug:
        p = LIBRARY_DIR / f"{matched_slug}.json"
        if p.exists():
            with open(p) as f:
                return json.load(f)
    return None


ATTEMPT_FIRST_TOKEN_TIMEOUT = 60   # seconds to wait for the model to start answering
ATTEMPT_IDLE_TIMEOUT = 30          # max silence once it is streaming
ATTEMPT_MAX_SECONDS = 110
TOTAL_BUDGET_SECONDS = 200

Emit = Callable[[dict], Awaitable[None]]


def friendly_error(err: Exception | str) -> str:
    msg = str(err)
    if "API_KEY_INVALID" in msg or "API key not valid" in msg:
        return "Invalid Gemini API key. Check GEMINI_API_KEY in the backend environment."
    if "429" in msg or "RESOURCE_EXHAUSTED" in msg:
        return "Gemini rate limit reached. Please wait a minute and try again."
    if "503" in msg or "UNAVAILABLE" in msg or "overloaded" in msg.lower():
        return "Gemini is temporarily overloaded. Please try again in a moment."
    return msg[:300]


def _stream_attempt(client, model, prompt, use_search, loop, queue, cancel):
    """Runs in a worker thread: streams one Gemini call, pushing progress onto the queue."""
    def put(item):
        loop.call_soon_threadsafe(queue.put_nowait, item)

    try:
        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=0.2,
            tools=[types.Tool(google_search=types.GoogleSearch())] if use_search else None,
        )
        text_parts: list[str] = []
        sources: dict[str, str] = {}
        for chunk in client.models.generate_content_stream(model=model, contents=prompt, config=config):
            if cancel.is_set():
                return
            try:
                piece = chunk.text or ""
            except Exception:
                piece = ""
            if piece:
                text_parts.append(piece)
            if chunk.candidates:
                meta = chunk.candidates[0].grounding_metadata
                for gc in (meta.grounding_chunks or []) if meta else []:
                    if gc.web and gc.web.uri:
                        sources[gc.web.uri] = gc.web.title or gc.web.uri
            put(("progress", sum(len(p) for p in text_parts), len(sources)))
        put(("done", "".join(text_parts).strip(), [
            {
                "title": title,
                "url": url,
                "type": "official_docs" if re.search(r"docs?\.|developer|api\.", url + title) else "community",
            }
            for url, title in sources.items()
        ]))
    except Exception as e:  # noqa: BLE001
        put(("error", e))


async def _run_attempt(client, model, prompt, use_search, emit: Emit, deadline: float):
    """One bounded Gemini attempt. Returns (text, sources) or raises."""
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue = asyncio.Queue()
    cancel = threading.Event()
    threading.Thread(
        target=_stream_attempt, args=(client, model, prompt, use_search, loop, queue, cancel), daemon=True
    ).start()

    started = time.monotonic()
    got_first = False
    last_note = 0.0
    try:
        while True:
            remaining = min(deadline, started + ATTEMPT_MAX_SECONDS) - time.monotonic()
            if remaining <= 0:
                raise TimeoutError("attempt exceeded its time limit")
            wait = min(remaining, ATTEMPT_IDLE_TIMEOUT if got_first else ATTEMPT_FIRST_TOKEN_TIMEOUT)
            try:
                item = await asyncio.wait_for(queue.get(), timeout=wait)
            except asyncio.TimeoutError:
                raise TimeoutError("no response from the model in time") from None
            kind = item[0]
            if kind == "error":
                raise item[1]
            if kind == "progress":
                got_first = True
                if time.monotonic() - last_note > 4:
                    last_note = time.monotonic()
                    extra = f", {item[2]} web sources found" if item[2] else ""
                    await emit({"type": "status", "message": f"Writing the guide… {item[1]:,} characters{extra}"})
                continue
            return item[1], item[2]  # done
    finally:
        cancel.set()


async def research(app_name: str, website_url: str | None, api_key: str, emit: Emit, fresh: bool = False) -> None:
    """Research an app and emit status / guide / done / error events through `emit`."""
    await emit({"type": "status", "message": f"Starting research on {app_name}…"})

    # 1. Already generated recently? Serve it instantly.
    cached = GENERATED_DIR / f"{slugify(app_name)}.json"
    if cached.exists() and not fresh:
        try:
            guide = json.loads(cached.read_text())
            await emit({"type": "status", "message": "Found a previously generated guide for this app."})
            await emit({"type": "guide", "data": guide})
            await emit({"type": "done", "message": "Guide ready"})
            return
        except (OSError, ValueError):
            pass

    # 2. Pre-verified library guide?
    library_match = None if fresh else find_matching_library_guide(app_name)
    if library_match:
        await emit({"type": "status", "message": f"{library_match['app']} is in the verified guide library — loading it."})
        await asyncio.sleep(0.4)
        await emit({"type": "guide", "data": library_match})
        await emit({"type": "done", "message": "Guide ready"})
        return

    # 3. Live research with Gemini (+ Google Search grounding), bounded by time.
    client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=90_000))
    prompt = GUIDE_PROMPT_TEMPLATE.format(
        app_name=app_name, website_hint=f"Website: {website_url}" if website_url else ""
    )
    configured = os.getenv("GEMINI_MODEL", "").strip()
    models = list(dict.fromkeys([m for m in [configured, *DEFAULT_MODELS] if m]))
    # Grounded first, then ungrounded on the same and the next model.
    plan = [(models[0], True), (models[0], False)] + [(m, False) for m in models[1:3]]

    overall_deadline = time.monotonic() + TOTAL_BUDGET_SECONDS
    last_error = "Research could not be completed."
    for n, (model, use_search) in enumerate(plan, 1):
        if overall_deadline - time.monotonic() < 20:
            break
        mode = "with Google Search" if use_search else "without web search (faster fallback)"
        await emit({"type": "status", "message": f"Attempt {n}/{len(plan)}: researching {mode} using {model}…"})
        try:
            raw_text, sources = await _run_attempt(client, model, prompt, use_search, emit, overall_deadline)
            if sources:
                await emit({"type": "status", "message": f"Consulted {len(sources)} web sources via Google Search"})
            await emit({"type": "status", "message": "Validating the guide structure…"})
            guide = normalize_guide(extract_json(raw_text), app_name, sources)
            if fresh and find_matching_library_guide(app_name):
                guide["slug"] = f"{guide['slug']}-live"  # never collide with the library guide's URL
            await emit({"type": "status", "message": "Testing the guide: checking cited links and OAuth discovery endpoints…"})
            guide = await probe_guide(guide)
            save_generated_guide(guide)
            if not fresh and slugify(app_name) != guide["slug"]:
                (GENERATED_DIR / f"{slugify(app_name)}.json").write_text(json.dumps(guide, indent=2))
            await emit({"type": "guide", "data": guide})
            await emit({"type": "done", "message": "Guide ready"})
            return
        except Exception as e:  # noqa: BLE001 - every failure moves on to the next attempt
            last_error = friendly_error(e) if not isinstance(e, TimeoutError) else (
                "The research service took too long to respond."
            )
            if isinstance(e, (ValueError, json.JSONDecodeError)):
                last_error = "The model returned a guide in an unexpected format."
            await emit({"type": "status", "message": f"Attempt {n} failed: {last_error}"})
            msg = str(e)
            if "API_KEY_INVALID" in msg or "API key not valid" in msg:
                break  # no point retrying

    retry_hint = "" if "Invalid Gemini API key" in last_error else " Please try again in a minute."
    await emit({"type": "error", "message": f"{last_error}{retry_hint}"})
