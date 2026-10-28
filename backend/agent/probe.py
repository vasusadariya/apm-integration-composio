"""
Automated checks the agent runs against a freshly generated guide.

These are real network probes (not model output): are the URLs the guide cites reachable,
and does the provider publish OAuth/OpenID discovery metadata. Results are recorded as
agent actions and in the guide's `verification` block so the guide states what was
actually tested versus what only the model claims.
"""
import asyncio
import ipaddress
import socket
from datetime import datetime, timezone
from urllib.parse import urlparse

import httpx

MAX_URLS = 12
TIMEOUT = 6.0
UA = "Mozilla/5.0 (compatible; OAuthGuideBot/1.0)"


def is_public_url(url: str) -> bool:
    """Reject non-http(s) URLs and anything resolving to a private/loopback address (SSRF guard)."""
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https") or not parsed.hostname:
            return False
        for info in socket.getaddrinfo(parsed.hostname, None):
            ip = ipaddress.ip_address(info[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
                return False
        return True
    except (socket.gaierror, ValueError):
        return False


async def _check(client: httpx.AsyncClient, url: str) -> tuple[str, int | None, str]:
    if not await asyncio.to_thread(is_public_url, url):
        return url, None, "skipped (not a public http(s) URL)"
    try:
        r = await client.get(url, follow_redirects=True)
        # 401/403/429 mean the page exists but blocks bots/anonymous access.
        ok = r.status_code < 400 or r.status_code in (401, 403, 429)
        return url, r.status_code, "reachable" if ok else f"HTTP {r.status_code}"
    except httpx.HTTPError as e:
        return url, None, f"unreachable ({type(e).__name__})"


async def _discovery(client: httpx.AsyncClient, website: str) -> dict | None:
    host = website.replace("https://", "").replace("http://", "").strip("/").split("/")[0]
    if not host:
        return None
    for candidate in (host, f"accounts.{host}", f"login.{host}"):
        for path in ("/.well-known/openid-configuration", "/.well-known/oauth-authorization-server"):
            url = f"https://{candidate}{path}"
            if not await asyncio.to_thread(is_public_url, url):
                continue
            try:
                r = await client.get(url, follow_redirects=True)
                if r.status_code == 200 and "json" in r.headers.get("content-type", ""):
                    data = r.json()
                    if isinstance(data, dict) and data.get("authorization_endpoint"):
                        return {"url": url, "authorization_endpoint": data["authorization_endpoint"],
                                "token_endpoint": data.get("token_endpoint")}
            except (httpx.HTTPError, ValueError):
                continue
    return None


async def probe_guide(guide: dict) -> dict:
    """Run the checks, attach agent_actions + verification to `guide`, and return it."""
    urls: list[str] = []
    for item in [*(s.get("url") for s in guide.get("steps", [])), *(s.get("url") for s in guide.get("sources", []))]:
        if item and item not in urls:
            urls.append(item)
    urls = urls[:MAX_URLS]

    async with httpx.AsyncClient(timeout=TIMEOUT, headers={"User-Agent": UA}) as client:
        results, discovery = await asyncio.gather(
            asyncio.gather(*[_check(client, u) for u in urls]),
            _discovery(client, guide.get("website", "")),
        )

    ok = [r for r in results if r[2] == "reachable"]
    bad = [r for r in results if r[2] != "reachable"]

    actions = list(guide.get("agent_actions", []))
    actions.append({
        "action": f"Link check: fetched {len(results)} URLs cited by this guide",
        "result": f"{len(ok)} reachable" + (f"; {len(bad)} not confirmed: " + ", ".join(f"{u} ({why})" for u, _, why in bad[:4]) if bad else ""),
        "status": "done" if not bad else "partial",
    })
    actions.append({
        "action": "OAuth discovery probe (/.well-known/openid-configuration)",
        "result": (f"Found authorization endpoint {discovery['authorization_endpoint']}" if discovery
                   else "No public OpenID/OAuth discovery document found (many providers do not publish one)"),
        "status": "done" if discovery else "partial",
    })
    guide["agent_actions"] = actions

    confirmed = [f"{len(ok)} of {len(results)} cited URLs are reachable"] if results else []
    if discovery:
        confirmed.append(f"Provider publishes OAuth discovery metadata: authorization endpoint {discovery['authorization_endpoint']}")
    guide["verification"] = {
        "status": "automated_checks",
        "checked_on": datetime.now(timezone.utc).date().isoformat(),
        "checked_against": [u for u, _, _ in ok][:6],
        "confirmed": confirmed,
        "corrected": [],
        "unverified": [
            "All setup steps, requirements and timelines are model-written from web search results; only link reachability and discovery metadata were machine-checked",
            *[f"URL not confirmed: {u} ({why})" for u, _, why in bad[:4]],
        ],
    }
    return guide
