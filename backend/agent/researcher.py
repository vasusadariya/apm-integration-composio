"""
OAuth Guide Research Agent using Google Gemini.
Investigates a given app/URL and generates a structured OAuth setup guide.
"""
import json
import os
import asyncio
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import AsyncGenerator

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
  "confidence": "<verified|source_supported|inferred|uncertain>",
  "last_verified": "<YYYY-MM-DD>"
}}

Return ONLY the JSON object, no markdown fences, no extra text.
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


async def stream_guide_generation(
    app_name: str,
    website_url: str | None = None,
    api_key: str = "",
) -> AsyncGenerator[str, None]:
    """
    Stream guide generation events as Server-Sent Event data strings.
    Yields SSE-formatted strings with live dynamic progress.
    """
    yield f"data: {json.dumps({'type': 'status', 'message': f'Starting research on {app_name}...'})}\n\n"
    await asyncio.sleep(0.4)

    # 1. Quick check: If it matches a pre-verified library app, stream research steps and deliver
    library_match = find_matching_library_guide(app_name)
    if library_match:
        app_title = library_match["app"]
        yield f"data: {json.dumps({'type': 'status', 'message': f'Found official developer portal for {app_title}...'})}\n\n"
        await asyncio.sleep(0.6)
        yield f"data: {json.dumps({'type': 'status', 'message': 'Extracting OAuth 2.0 registration flows & credentials...'})}\n\n"
        await asyncio.sleep(0.6)
        yield f"data: {json.dumps({'type': 'status', 'message': 'Analyzing scope tiers, permissions & review requirements...'})}\n\n"
        await asyncio.sleep(0.6)
        yield f"data: {json.dumps({'type': 'status', 'message': 'Compiling verified setup guide and known blockers...'})}\n\n"
        await asyncio.sleep(0.4)
        yield f"data: {json.dumps({'type': 'guide', 'data': library_match})}\n\n"
        yield f"data: {json.dumps({'type': 'done', 'message': 'Guide generation complete'})}\n\n"
        return

    # 2. For unfamiliar apps: invoke Gemini with dynamic live heartbeats
    client = genai.Client(api_key=api_key)
    website_hint = f"Website: {website_url}" if website_url else ""
    prompt = GUIDE_PROMPT_TEMPLATE.format(
        app_name=app_name,
        website_hint=website_hint,
    )

    yield f"data: {json.dumps({'type': 'status', 'message': 'Searching provider developer documentation...'})}\n\n"

    def _call_gemini() -> tuple[str, list[dict]]:
        configured_model = os.getenv("GEMINI_MODEL", "").strip()
        models_to_try = list(dict.fromkeys([m for m in [configured_model, *DEFAULT_MODELS] if m]))

        last_err = None
        # Prefer Google Search grounding; fall back to plain generation if the
        # search tool is unavailable (quota, unsupported model).
        for use_search in (True, False):
            for model_name in models_to_try:
                try:
                    config = types.GenerateContentConfig(
                        system_instruction=SYSTEM_INSTRUCTION,
                        temperature=0.2,
                        tools=[types.Tool(google_search=types.GoogleSearch())] if use_search else None,
                    )
                    response = client.models.generate_content(
                        model=model_name, contents=prompt, config=config
                    )
                    sources: list[dict] = []
                    if use_search and response.candidates:
                        meta = response.candidates[0].grounding_metadata
                        for chunk in (meta.grounding_chunks or []) if meta else []:
                            if chunk.web and chunk.web.uri:
                                sources.append({
                                    "title": chunk.web.title or chunk.web.uri,
                                    "url": chunk.web.uri,
                                    "type": "official_docs" if re.search(r"docs?\.|developer|api\.", chunk.web.uri + (chunk.web.title or "")) else "community",
                                })
                    return (response.text or "").strip(), sources
                except Exception as e:
                    last_err = e
                    continue

        if last_err:
            raise last_err
        return "", []

    # Start generation in thread
    generation_task = asyncio.create_task(asyncio.to_thread(_call_gemini))

    status_steps = [
        "Found developer portal & OAuth documentation...",
        "Extracting OAuth client registration and redirect URI rules...",
        "Analyzing permissions, scope hierarchy, and review thresholds...",
        "Identifying prerequisites (domain verification, privacy policy, CASA)...",
        "Evaluating review timeline and common rejection causes...",
        "Synthesizing structured guide...",
    ]

    step_index = 0
    while not generation_task.done():
        if step_index < len(status_steps):
            yield f"data: {json.dumps({'type': 'status', 'message': status_steps[step_index]})}\n\n"
            step_index += 1
        await asyncio.sleep(2.0)

    raw_text = ""
    try:
        raw_text, grounded_sources = await generation_task
        if grounded_sources:
            yield f"data: {json.dumps({'type': 'status', 'message': f'Consulted {len(grounded_sources)} web sources via Google Search'})}\n\n"

        guide_data = normalize_guide(extract_json(raw_text), app_name, grounded_sources)
        save_generated_guide(guide_data)

        yield f"data: {json.dumps({'type': 'status', 'message': 'Guide generation complete!'})}\n\n"
        yield f"data: {json.dumps({'type': 'guide', 'data': guide_data})}\n\n"
        yield f"data: {json.dumps({'type': 'done', 'message': 'Guide generation complete'})}\n\n"

    except (json.JSONDecodeError, ValueError) as e:
        yield f"data: {json.dumps({'type': 'error', 'message': f'Failed to parse guide JSON: {str(e)[:300]}'})}\n\n"
        yield f"data: {json.dumps({'type': 'raw', 'text': raw_text or 'No output'})}\n\n"
    except Exception as e:
        err_msg = str(e)
        if "API_KEY_INVALID" in err_msg or "API key not valid" in err_msg:
            err_msg = "Invalid Gemini API key. Please check the GEMINI_API_KEY in backend/.env. You can create a free key at https://aistudio.google.com/app/apikey"
        elif "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
            err_msg = "Gemini API rate limit reached. Please wait a few seconds and try again."
        yield f"data: {json.dumps({'type': 'error', 'message': err_msg})}\n\n"
