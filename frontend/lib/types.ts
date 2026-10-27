// Type definitions for OAuth Guide data structures

export interface Step {
  number: number;
  title: string;
  description: string;
  agent_can_do: boolean;
  estimated_time: string;
  url?: string;
  warnings: string[];
}

export interface Blocker {
  title: string;
  description: string;
  severity: 'blocking' | 'warning' | 'info';
  workaround?: string;
}

export interface Source {
  title: string;
  url: string;
  type: 'official_docs' | 'community' | 'inferred';
}

export interface Requirements {
  account_type: string;
  needs_live_website: boolean;
  needs_privacy_policy: boolean;
  needs_terms_of_service: boolean;
  needs_video_demo: boolean;
  needs_security_audit: boolean;
  allowed_scopes: string[];
  restricted_scopes: string[];
}

export interface AgentAction {
  action: string;
  result: string;
  status: 'done' | 'partial' | 'blocked';
}

export interface OAuthGuide {
  app: string;
  slug: string;
  website: string;
  logo_url: string;
  generated_at: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'very_hard';
  setup_time_estimate: string;
  approval_time_estimate: string;
  requires_approval: boolean;
  composio_managed_auth: boolean;
  summary: string;
  key_facts: string[];
  steps: Step[];
  requirements: Requirements;
  blockers: Blocker[];
  agent_actions: AgentAction[];
  sources: Source[];
  confidence: 'verified' | 'source_supported' | 'inferred' | 'uncertain';
  last_verified: string;
}

export type GuideCard = Pick<OAuthGuide,
  | 'app' | 'slug' | 'website' | 'logo_url'
  | 'difficulty' | 'setup_time_estimate' | 'approval_time_estimate'
  | 'requires_approval' | 'composio_managed_auth'
  | 'summary' | 'confidence'
>;

