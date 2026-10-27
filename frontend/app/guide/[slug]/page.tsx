'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchGuide } from '@/lib/api';
import type { OAuthGuide, Step, Blocker } from '@/lib/types';

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const config = {
    easy:      { label: '🟢 Easy',       bg: 'bg-green-100',  text: 'text-green-800' },
    medium:    { label: '🟡 Medium',     bg: 'bg-yellow-100', text: 'text-yellow-800' },
    hard:      { label: '🟠 Hard',       bg: 'bg-orange-100', text: 'text-orange-800' },
    very_hard: { label: '🔴 Very Hard',  bg: 'bg-red-100',    text: 'text-red-800' },
  }[difficulty] ?? { label: difficulty, bg: 'bg-slate-100', text: 'text-slate-800' };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const config = {
    verified:        { label: '✅ Verified', bg: 'bg-green-50',  text: 'text-green-700' },
    source_supported:{ label: '📄 Source supported', bg: 'bg-blue-50', text: 'text-blue-700' },
    inferred:        { label: '🔍 Inferred', bg: 'bg-yellow-50', text: 'text-yellow-700' },
    uncertain:       { label: '❓ Uncertain', bg: 'bg-slate-50', text: 'text-slate-700' },
  }[confidence] ?? { label: confidence, bg: 'bg-slate-50', text: 'text-slate-700' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function StepCard({ step }: { step: Step }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
          {step.number}
        </div>
      </div>
      <div className="flex-1 pb-6 border-l border-slate-200 pl-4 -ml-8 ml-0">
        <div className="bg-white border border-slate-200 rounded-xl p-5 ml-4">
          <div className="flex flex-wrap items-start gap-2 mb-2">
            <h3 className="font-semibold text-slate-900">{step.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              step.agent_can_do
                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                : 'bg-slate-50 text-slate-600 border border-slate-200'
            }`}>
              {step.agent_can_do ? '🤖 Agent can do this' : '👤 You do this'}
            </span>
            <span className="text-xs text-slate-500">⏱ {step.estimated_time}</span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
          {step.url && (
            <a
              href={step.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              Open in provider portal →
            </a>
          )}
          {step.warnings.length > 0 && (
            <div className="mt-3 space-y-2">
              {step.warnings.map((warning, i) => (
                <div key={i} className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <span className="text-amber-500 flex-shrink-0">⚠️</span>
                  <p className="text-xs text-amber-800">{warning}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BlockerCard({ blocker }: { blocker: Blocker }) {
  const config = {
    blocking: { icon: '🚫', bg: 'bg-red-50', border: 'border-red-200', title: 'text-red-900', body: 'text-red-800' },
    warning:  { icon: '⚠️', bg: 'bg-amber-50', border: 'border-amber-200', title: 'text-amber-900', body: 'text-amber-800' },
    info:     { icon: 'ℹ️', bg: 'bg-blue-50', border: 'border-blue-200', title: 'text-blue-900', body: 'text-blue-800' },
  }[blocker.severity];

  return (
    <div className={`rounded-xl border ${config.bg} ${config.border} p-4`}>
      <div className="flex items-start gap-2">
        <span className="text-xl">{config.icon}</span>
        <div>
          <h4 className={`font-semibold ${config.title}`}>{blocker.title}</h4>
          <p className={`text-sm mt-1 ${config.body} leading-relaxed`}>{blocker.description}</p>
          {blocker.workaround && (
            <p className={`text-sm mt-2 ${config.body}`}>
              <span className="font-medium">Workaround: </span>{blocker.workaround}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GuidePage() {
  const routeParams = useParams();
  const slug = (routeParams?.slug as string) || '';
  const [guide, setGuide] = useState<OAuthGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetchGuide(slug)
      .then(setGuide)
      .catch(() => setError('Guide not found or backend is not running.'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="space-y-4">
          <div className="h-10 w-64 rounded-xl shimmer" />
          <div className="h-4 w-full rounded shimmer" />
          <div className="h-4 w-3/4 rounded shimmer" />
        </div>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-red-600 font-medium">{error || 'Guide not found'}</p>
        <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">← Back to library</Link>
      </div>
    );
  }

  const agentSteps = guide.steps.filter(s => s.agent_can_do).length;
  const totalSteps = guide.steps.length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/" className="text-sm text-blue-600 hover:underline">← All guides</Link>
      </div>

      {/* Hero */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 mb-8">
        <div className="flex flex-wrap items-start gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={guide.logo_url} alt={guide.app} className="w-10 h-10 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-slate-900">{guide.app}</h1>
              <DifficultyBadge difficulty={guide.difficulty} />
              <ConfidenceBadge confidence={guide.confidence} />
            </div>
            <p className="text-slate-500 text-sm">{guide.website} · Last verified {guide.last_verified}</p>
          </div>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            {copied ? '✓ Copied!' : '🔗 Share'}
          </button>
        </div>

        <p className="text-slate-700 leading-relaxed mb-6">{guide.summary}</p>

        {/* Metrics row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Setup Time', value: guide.setup_time_estimate },
            { label: 'Approval Wait', value: guide.approval_time_estimate },
            { label: 'Review Required', value: guide.requires_approval ? 'Yes' : 'No' },
            { label: 'Agent Automation', value: `${agentSteps}/${totalSteps} steps` },
          ].map((m) => (
            <div key={m.label} className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">{m.label}</p>
              <p className="font-semibold text-slate-800 text-sm">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Composio managed auth callout */}
        {guide.composio_managed_auth && (
          <div className="mt-4 flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="font-semibold text-blue-900 text-sm">Composio Managed Auth Available</p>
              <p className="text-blue-800 text-sm mt-0.5">
                You can prototype immediately using Composio&apos;s managed OAuth app — no setup required.
                Switch to your own OAuth app when going to production.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Key Facts */}
      {guide.key_facts.length > 0 && (
        <div className="bg-slate-900 rounded-2xl p-6 mb-8">
          <h2 className="text-white font-bold text-lg mb-4">📌 Key Facts</h2>
          <ul className="space-y-2">
            {guide.key_facts.map((fact, i) => (
              <li key={i} className="flex items-start gap-2 text-slate-300 text-sm">
                <span className="text-blue-400 mt-0.5 flex-shrink-0">→</span>
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Step-by-Step Guide</h2>
          <div className="flex gap-4 text-xs text-slate-500">
            <span>🤖 Agent handles {agentSteps} steps</span>
            <span>👤 You handle {totalSteps - agentSteps} steps</span>
          </div>
        </div>
        <div className="space-y-4">
          {guide.steps.map((step) => (
            <StepCard key={step.number} step={step} />
          ))}
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Requirements Checklist</h2>
        <p className="text-sm text-slate-500 mb-4">Account type: {guide.requirements.account_type}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { key: 'needs_live_website',   label: 'Live public website' },
            { key: 'needs_privacy_policy', label: 'Privacy policy' },
            { key: 'needs_terms_of_service', label: 'Terms of service' },
            { key: 'needs_video_demo',     label: 'Video demo of OAuth flow' },
            { key: 'needs_security_audit', label: 'Security audit (CASA/CAIQ)' },
          ].map(({ key, label }) => {
            const needed = guide.requirements[key as keyof typeof guide.requirements] as boolean;
            return (
              <div key={key} className={`flex items-center gap-2.5 p-3 rounded-lg border ${
                needed ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50'
              }`}>
                <span className={needed ? 'text-amber-500' : 'text-green-500'}>
                  {needed ? '⚠️' : '✅'}
                </span>
                <span className={`text-sm ${needed ? 'text-amber-800 font-medium' : 'text-slate-500'}`}>
                  {label} {needed ? 'required' : 'not required'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Scopes */}
        {(guide.requirements.allowed_scopes.length > 0 || guide.requirements.restricted_scopes.length > 0) && (
          <div className="mt-4 space-y-3">
            {guide.requirements.allowed_scopes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Common Scopes</p>
                <div className="flex flex-wrap gap-2">
                  {guide.requirements.allowed_scopes.map(s => (
                    <code key={s} className="text-xs bg-green-50 border border-green-200 text-green-800 px-2 py-1 rounded-md">{s}</code>
                  ))}
                </div>
              </div>
            )}
            {guide.requirements.restricted_scopes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Restricted Scopes (require extra approval)</p>
                <div className="flex flex-wrap gap-2">
                  {guide.requirements.restricted_scopes.map(s => (
                    <code key={s} className="text-xs bg-red-50 border border-red-200 text-red-800 px-2 py-1 rounded-md">{s}</code>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Blockers */}
      {guide.blockers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Known Blockers & Gotchas</h2>
          <div className="space-y-3">
            {guide.blockers.map((blocker, i) => (
              <BlockerCard key={i} blocker={blocker} />
            ))}
          </div>
        </div>
      )}

      {/* Agent Actions */}
      {guide.agent_actions.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-bold text-purple-900 mb-1">🤖 What the Agent Did</h2>
          <p className="text-sm text-purple-700 mb-4">These are the research and automation steps the AI agent completed to build this guide.</p>
          <div className="space-y-2">
            {guide.agent_actions.map((action, i) => (
              <div key={i} className="flex items-start gap-3 bg-white rounded-xl border border-purple-200 p-3">
                <span className={
                  action.status === 'done' ? 'text-green-500' :
                  action.status === 'partial' ? 'text-yellow-500' : 'text-red-500'
                }>
                  {action.status === 'done' ? '✅' : action.status === 'partial' ? '⚠️' : '❌'}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-800">{action.action}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{action.result}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      {guide.sources.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-3">📚 Sources</h2>
          <div className="space-y-2">
            {guide.sources.map((source, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  {source.type === 'official_docs' ? '📄' : source.type === 'community' ? '💬' : '🔍'}
                </span>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {source.title}
                </a>
                <span className="text-xs text-slate-400 capitalize">({source.type.replace('_', ' ')})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

