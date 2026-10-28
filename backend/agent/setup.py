"""
Things the agent can really do for a developer without provider credentials:

1. Live-test the provider's OAuth endpoints (are they up, do they reject an unregistered client).
2. Build a "setup kit": copy-paste values, deep links, and — where the provider supports it —
   a ready-made app manifest the developer pastes into the provider's console.

Nothing here registers an app or touches an account.
"""
import asyncio
import json
from urllib.parse import quote, urlparse

import httpx

from agent.probe import UA, is_public_url

COMPOSIO_CALLBACK = "https://backend.composio.dev/api/v3/toolkits/auth/callback"
PROBE_CLIENT_ID = "oauth-guide-probe-000000"  # deliberately not a real client
TIMEOUT = 8.0


def _classify_authorize(status: int, location: str, body: str) -> tuple[str, str]:
    """Return (outcome, human description). outcome: rejects_client | login_first | reachable | blocked | down."""
    loc, text = location.lower(), body.lower()
    if any(k in loc for k in ("error", "invalid")) or any(k in text for k in ("invalid_client", "invalid client", "unknown client", "client id is invalid", "unauthorized_client", "invalid_request")):
        return "rejects_client", f"HTTP {status} — rejected the unregistered client_id (registration is validated server-side)"
    if status in (301, 302, 303, 307, 308) and any(k in loc for k in ("login", "signin", "sign-in", "install")):
        return "login_first", f"HTTP {status} — redirected to sign-in before validating the client"
    if status in (400, 401):
        return "rejects_client", f"HTTP {status} — refused the request for an unregistered client"
    if status == 403:
        return "blocked", "HTTP 403 — endpoint is up but blocks automated requests"
    if status < 400:
        return "reachable", f"HTTP {status} — endpoint is up (client validation happens on the page)"
    return "down", f"HTTP {status}"


async def probe_endpoints(authorization_url: str | None, token_url: str | None = None) -> list[dict]:
    """Send deliberately-invalid OAuth requests and report how the provider answers."""
    results: list[dict] = []
    async with httpx.AsyncClient(timeout=TIMEOUT, headers={"User-Agent": UA}) as client:
        if authorization_url:
            if not await asyncio.to_thread(is_public_url, authorization_url):
                results.append({"endpoint": "authorization", "url": authorization_url, "outcome": "skipped", "detail": "not a public https URL"})
            else:
                try:
                    r = await client.get(
                        authorization_url,
                        params={"client_id": PROBE_CLIENT_ID, "redirect_uri": COMPOSIO_CALLBACK, "response_type": "code", "state": "probe"},
                        follow_redirects=False,
                    )
                    outcome, detail = _classify_authorize(r.status_code, r.headers.get("location", ""), r.text[:4000])
                    results.append({"endpoint": "authorization", "url": authorization_url, "status": r.status_code, "outcome": outcome, "detail": detail})
                except httpx.HTTPError as e:
                    results.append({"endpoint": "authorization", "url": authorization_url, "outcome": "down", "detail": f"unreachable ({type(e).__name__})"})
        if token_url:
            if not await asyncio.to_thread(is_public_url, token_url):
                results.append({"endpoint": "token", "url": token_url, "outcome": "skipped", "detail": "not a public https URL"})
            else:
                try:
                    r = await client.post(
                        token_url,
                        data={"grant_type": "authorization_code", "code": "probe", "redirect_uri": COMPOSIO_CALLBACK,
                              "client_id": PROBE_CLIENT_ID, "client_secret": "probe"},
                        follow_redirects=False,
                    )
                    err = ""
                    try:
                        j = r.json()
                        err = str(j.get("error") or j.get("error_code") or (j.get("errors") or [{}])[0].get("code", "") if isinstance(j, dict) else "")
                    except ValueError:
                        pass
                    if r.status_code in (400, 401, 403) or err:
                        detail = f"HTTP {r.status_code}" + (f" — OAuth error '{err}' for invalid credentials" if err else " — refused invalid credentials")
                        results.append({"endpoint": "token", "url": token_url, "status": r.status_code, "outcome": "rejects_client", "detail": detail})
                    elif r.status_code < 500:
                        results.append({"endpoint": "token", "url": token_url, "status": r.status_code, "outcome": "reachable", "detail": f"HTTP {r.status_code} — endpoint is up"})
                    else:
                        results.append({"endpoint": "token", "url": token_url, "status": r.status_code, "outcome": "down", "detail": f"HTTP {r.status_code}"})
                except httpx.HTTPError as e:
                    results.append({"endpoint": "token", "url": token_url, "outcome": "down", "detail": f"unreachable ({type(e).__name__})"})
    return results


def _slack_manifest(guide: dict) -> dict:
    req = guide.get("requirements", {})
    return {
        "display_information": {"name": "My OAuth App"},
        "features": {"bot_user": {"display_name": "my-oauth-bot"}},
        "oauth_config": {
            "redirect_urls": [COMPOSIO_CALLBACK],
            "scopes": {"bot": [x for x in req.get("allowed_scopes", []) if ":" in x][:20] or ["chat:write"], "user": []},
        },
        "settings": {"org_deploy_enabled": False},
    }


def build_setup_kit(guide: dict) -> dict:
    """Copy-paste values, links and files derived from the guide. Computed on read, never stored."""
    slug = guide.get("slug", "")
    req = guide.get("requirements", {})
    steps = guide.get("steps", [])
    first_url = next((s["url"] for s in steps if s.get("url")), None)

    values = [
        {"label": "Redirect / callback URI", "value": COMPOSIO_CALLBACK,
         "hint": "Paste into the provider's redirect-URL field if you connect through Composio. Use your own URL if you handle OAuth yourself."},
    ]
    if req.get("allowed_scopes"):
        values.append({"label": "Scopes (space-separated)", "value": " ".join(req["allowed_scopes"]),
                       "hint": "Common scopes from this guide — trim to the minimum you need."})
    values.append({
        "label": "Composio custom auth config (template)",
        "value": json.dumps({"toolkit": slug.split("-")[0], "type": "use_custom_auth", "auth_scheme": "OAUTH2",
                             "credentials": {"client_id": "<from the provider console>", "client_secret": "<from the provider console>"}}, indent=2),
        "hint": "Shape described in this guide's last step; confirm field names in the Composio docs before using.",
    })

    links = []
    if first_url:
        links.append({"label": "Open the provider's app registration", "url": first_url})
    links.append({"label": "Composio managed-auth directory", "url": "https://docs.composio.dev/toolkits/managed-auth"})

    files = []
    if slug.startswith("slack"):
        manifest = _slack_manifest(guide)
        files.append({
            "filename": "slack-app-manifest.json", "mime": "application/json",
            "content": json.dumps(manifest, indent=2),
            "note": "Create a Slack app from this manifest (fields per Slack's manifest reference). Rename the app and trim scopes first.",
        })
        links.insert(0, {"label": "Create the Slack app with this manifest prefilled",
                         "url": "https://api.slack.com/apps?new_app=1&manifest_json=" + quote(json.dumps(manifest, separators=(",", ":")))})
    if slug.startswith("stripe"):
        files.append({
            "filename": "stripe-app-manifest-oauth-fields.json", "mime": "application/json",
            "content": json.dumps({"id": "com.example.my-app", "version": "0.0.1", "name": "Your Stripe App",
                                   "stripe_api_access_type": "oauth", "distribution_type": "public",
                                   "allowed_redirect_uris": [COMPOSIO_CALLBACK]}, indent=2),
            "note": "OAuth-related fields of a Stripe App manifest (per Stripe's docs). Add permissions, then run `stripe apps upload`.",
        })
    return {"values": values, "links": links, "files": files}
