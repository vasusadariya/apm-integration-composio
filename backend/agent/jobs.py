"""
In-memory research jobs.

A job runs independently of any HTTP connection and records every event it emits, so a
client can disconnect (refresh the page, switch tabs, lose network) and later replay the
events from the start and keep following the same run.
"""
import asyncio
import json
import time
import uuid
from typing import AsyncGenerator

from agent.researcher import research, slugify

JOB_TTL_SECONDS = 60 * 60
MAX_CONCURRENT_RESEARCH = 2

_jobs: dict[str, "Job"] = {}
_by_key: dict[str, str] = {}
_slots: asyncio.Semaphore | None = None


class Job:
    def __init__(self, app_name: str, website_url: str | None, fresh: bool = False):
        self.id = uuid.uuid4().hex[:12]
        self.app_name = app_name
        self.website_url = website_url
        self.fresh = fresh
        self.created_at = time.time()
        self.events: list[dict] = []
        self.finished = False
        self.cond = asyncio.Condition()

    async def emit(self, event: dict) -> None:
        event = {**event, "ts": time.time()}
        async with self.cond:
            self.events.append(event)
            if event["type"] in ("done", "error"):
                self.finished = True
            self.cond.notify_all()

    @property
    def status(self) -> str:
        if not self.finished:
            return "running"
        return "error" if self.events and self.events[-1]["type"] == "error" else "done"


def _cleanup() -> None:
    cutoff = time.time() - JOB_TTL_SECONDS
    for jid in [j for j, job in _jobs.items() if job.created_at < cutoff and job.finished]:
        job = _jobs.pop(jid)
        if _by_key.get(_key(job.app_name, job.fresh)) == jid:
            _by_key.pop(_key(job.app_name, job.fresh), None)


async def _run(job: Job, api_key: str) -> None:
    global _slots
    if _slots is None:
        _slots = asyncio.Semaphore(MAX_CONCURRENT_RESEARCH)
    try:
        if _slots.locked():
            await job.emit({"type": "status", "message": "Waiting for a free research slot…"})
        async with _slots:
            await research(job.app_name, job.website_url, api_key, job.emit, job.fresh)
    except Exception as e:  # noqa: BLE001
        await job.emit({"type": "error", "message": f"Unexpected error: {str(e)[:200]}"})
    finally:
        if not job.finished:
            await job.emit({"type": "error", "message": "Research ended unexpectedly."})


def _key(app_name: str, fresh: bool) -> str:
    return slugify(app_name) + (":fresh" if fresh else "")


def start_job(app_name: str, website_url: str | None, api_key: str, fresh: bool = False, before_start=None) -> tuple[Job, bool]:
    """Start a job, or return the existing one for the same app. Returns (job, reused)."""
    _cleanup()
    key = _key(app_name, fresh)
    existing = _jobs.get(_by_key.get(key, ""))
    # Reuse a running job, or a successful one (re-running a failed job is allowed).
    if existing and (not existing.finished or existing.status == "done"):
        return existing, True
    if before_start:
        before_start()  # may raise (e.g. rate limit) before any work is scheduled
    job = Job(app_name, website_url, fresh)
    _jobs[job.id] = job
    _by_key[key] = job.id
    asyncio.create_task(_run(job, api_key))
    return job, False


def get_job(job_id: str) -> Job | None:
    return _jobs.get(job_id)


def sse(event: dict, event_id: int) -> str:
    return f"id: {event_id}\ndata: {json.dumps(event)}\n\n"


async def stream_events(job: Job, start: int = 0) -> AsyncGenerator[str, None]:
    """Replay recorded events from `start`, then follow live until the job finishes."""
    index = start
    while True:
        async with job.cond:
            while index >= len(job.events) and not job.finished:
                try:
                    await asyncio.wait_for(job.cond.wait(), timeout=10)
                except asyncio.TimeoutError:
                    break
            batch = job.events[index:]
            finished = job.finished
        if batch:
            for ev in batch:
                yield sse(ev, index)
                index += 1
        elif not finished:
            yield ": keepalive\n\n"  # keeps proxies from closing an idle stream
        if finished and index >= len(job.events):
            return
