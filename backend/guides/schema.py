"""Pydantic models for OAuth guide data structure."""
from typing import Literal, Optional
from pydantic import BaseModel


class Step(BaseModel):
    number: int
    title: str
    description: str
    agent_can_do: bool
    estimated_time: str
    url: Optional[str] = None
    warnings: list[str] = []


class Blocker(BaseModel):
    title: str
    description: str
    severity: Literal["blocking", "warning", "info"]
    workaround: Optional[str] = None


class Source(BaseModel):
    title: str
    url: str
    type: Literal["official_docs", "community", "inferred"]


class Requirements(BaseModel):
    account_type: str
    needs_live_website: bool
    needs_privacy_policy: bool
    needs_terms_of_service: bool
    needs_video_demo: bool
    needs_security_audit: bool
    allowed_scopes: list[str] = []
    restricted_scopes: list[str] = []


class AgentAction(BaseModel):
    action: str
    result: str
    status: Literal["done", "partial", "blocked"]


class OAuthGuide(BaseModel):
    app: str
    slug: str
    website: str
    logo_url: str
    generated_at: str
    difficulty: Literal["easy", "medium", "hard", "very_hard"]
    setup_time_estimate: str
    approval_time_estimate: str
    requires_approval: bool
    composio_managed_auth: bool
    summary: str
    key_facts: list[str]
    steps: list[Step]
    requirements: Requirements
    blockers: list[Blocker]
    agent_actions: list[AgentAction]
    sources: list[Source]
    confidence: Literal["verified", "source_supported", "inferred", "uncertain"]
    last_verified: str

