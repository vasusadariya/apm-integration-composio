'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { shortName, type OAuthGuide, type Step, type Blocker } from '@/lib/types';
import GlitchBars from './GlitchBars';
import Reveal from './Reveal';
import AppLogo from './AppLogo';
import DifficultyBadge, { DifficultyMeter } from './DifficultyBadge';

export { DifficultyBadge };

const CONFIDENCE: Record<string, { label: string; cls: string }> = {
  verified:         { label: '✓ Verified from docs',  cls: 'border-emerald-400/40 text-emerald-300' },
  source_supported: { label: '◈ Source supported',     cls: 'border-sky-400/40 text-sky-300' },
  inferred:         { label: '~ Inferred',             cls: 'border-amber-400/40 text-amber-300' },
  uncertain:        { label: '? Uncertain',            cls: 'border-white/25 text-white/60' },
};

const SECTIONS = [
  { id: 'steps', label: 'Steps' },
  { id: 'requirements', label: 'Requirements' },
  { id: 'blockers', label: 'Blockers' },
  { id: 'agent', label: 'Agent log' },
  { id: 'sources', label: 'Sources' },
];

// ─── Step ────────────────────────────────────────────────────────────────────
function StepCard({
  step, done, onToggle, isLast,
}: { step: Step; done: boolean; onToggle: () => void; isLast: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="relative flex gap-5">
      {/* timeline */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={onToggle}
          aria-label={done ? `Mark step ${step.number} not done` : `Mark step ${step.number} done`}
          className={`z-10 flex h-10 w-10 flex-none items-center justify-center border font-mono text-sm transition-all duration-300 ${
            done ? 'border-brand bg-brand text-white' : 'border-zinc-300 bg-white text-ink hover:border-brand hover:text-brand'
          }`}
        >
          {done ? <span className="animate-pop">✓</span> : step.number}
        </button>
        {!isLast && <div className={`w-px flex-1 transition-colors duration-500 ${done ? 'bg-brand' : 'bg-zinc-200'}`} />}
      </div>

      <div className={`mb-6 flex-1 border bg-white transition-all duration-300 ${done ? 'border-zinc-200 opacity-60' : 'border-zinc-200 hover:border-zinc-400'}`}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 p-5 text-left"
        >
          <h3 className={`text-lg font-semibold ${done ? 'line-through decoration-zinc-400' : ''}`}>{step.title}</h3>
          <span
            className={`border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] ${
              step.agent_can_do ? 'border-brand/30 bg-brand-50 text-brand' : 'border-zinc-200 bg-zinc-50 text-zinc-600'
            }`}
          >
            {step.agent_can_do ? '⚡ Agent can do this' : '👤 You do this'}
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-zinc-400">⏱ {step.estimated_time}</span>
          <span className={`ml-auto text-zinc-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>⌄</span>
        </button>

        <div className={`fold ${open ? 'open' : ''}`}>
          <div>
            <div className="space-y-4 px-5 pb-5">
              <p className="text-[15px] leading-relaxed text-zinc-600">{step.description}</p>
              {step.url && (
                <a
                  href={step.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline btn-sm"
                >
                  Open provider page <span className="arr">↗</span>
                </a>
              )}
              {(step.warnings?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  {step.warnings!.map((w, i) => (
                    <div key={i} className="flex gap-3 border-l-2 border-amber-400 bg-amber-50 p-3">
                      <span>⚠️</span>
                      <p className="text-sm text-amber-900">{w}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Blocker ─────────────────────────────────────────────────────────────────
const BLOCKER_STYLE = {
  blocking: { icon: '🚫', bar: 'border-red-500', bg: 'bg-red-50', label: 'Blocking', text: 'text-red-700' },
  warning:  { icon: '⚠️', bar: 'border-amber-400', bg: 'bg-amber-50', label: 'Warning', text: 'text-amber-700' },
  info:     { icon: 'ℹ️', bar: 'border-brand', bg: 'bg-brand-50', label: 'Good to know', text: 'text-brand' },
} as const;

function BlockerCard({ blocker }: { blocker: Blocker }) {
  const c = BLOCKER_STYLE[blocker.severity] ?? BLOCKER_STYLE.info;
  return (
    <div className={`border border-l-4 border-zinc-200 ${c.bar} ${c.bg} p-5 transition-transform duration-300 hover:translate-x-1`}>
      <div className="flex items-center gap-2">
        <span>{c.icon}</span>
        <span className={`font-mono text-[11px] uppercase tracking-[0.1em] ${c.text}`}>{c.label}</span>
      </div>
      <h4 className="mt-2 font-semibold">{blocker.title}</h4>
      <p className="mt-1 text-sm leading-relaxed text-zinc-700">{blocker.description}</p>
      {blocker.workaround && (
        <p className="mt-3 border-t border-black/10 pt-3 text-sm text-zinc-700">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-zinc-500">Workaround · </span>
          {blocker.workaround}
        </p>
      )}
    </div>
  );
}

function SectionTitle({ eyebrow, title, id }: { eyebrow: string; title: string; id: string }) {
  return (
    <div id={id} className="mb-8 scroll-mt-32">
      <p className="eyebrow mb-2">{eyebrow}</p>
      <h2 className="text-3xl font-medium sm:text-4xl">{title}</h2>
    </div>
  );
}

// ─── Guide ───────────────────────────────────────────────────────────────────
export default function GuideDetail({
  guide, shareUrl, banner,
}: { guide: OAuthGuide; shareUrl?: string; banner?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState('steps');
  const storageKey = `checklist:${guide.slug}`;

  useEffect(() => {
    try {
      setChecked(JSON.parse(localStorage.getItem(storageKey) || '{}'));
    } catch {}
  }, [storageKey]);

  const toggle = (key: string) => {
    const next = { ...checked, [key]: !checked[key] };
    setChecked(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  };

  // Scroll-spy for the section nav
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    if (!els.length || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-30% 0px -60% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [guide.slug]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl || window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const steps = guide.steps ?? [];
  const agentSteps = steps.filter((s) => s.agent_can_do).length;
  const doneSteps = steps.filter((s) => checked[`step-${s.number}`]).length;
  const progress = steps.length ? Math.round((doneSteps / steps.length) * 100) : 0;
  const conf = CONFIDENCE[guide.confidence] ?? { label: guide.confidence, cls: 'border-white/25 text-white/60' };
  const req = guide.requirements;
  const sectionVisible = (id: string) =>
    id === 'blockers' ? guide.blockers?.length > 0
    : id === 'agent' ? guide.agent_actions?.length > 0
    : id === 'sources' ? guide.sources?.length > 0
    : true;

  return (
    <div>
      {/* ───────── Hero ───────── */}
      <section className="relative overflow-hidden bg-ink text-white">
        <GlitchBars intensity="soft" />
        <div className="grid-bg absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-4 pb-14 pt-28 sm:px-6 sm:pt-32">
          {banner ?? (
            <Link href="/" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.1em] text-white/50 transition-colors hover:text-white">
              <span>←</span> All guides
            </Link>
          )}

          <div className="animate-fade-up mt-8 flex flex-wrap items-start gap-6">
            <AppLogo src={guide.logo_url} name={guide.app} size={72} />
            <div className="min-w-0 flex-1">
              <h1 className="text-4xl font-medium sm:text-6xl">{shortName(guide.app)}</h1>
              {guide.app !== shortName(guide.app) && (
                <p className="mt-2 text-lg text-white/50">{guide.app.slice(shortName(guide.app).length).trim().replace(/^\(|\)$/g, '')}</p>
              )}
              <p className="mt-2 font-mono text-xs uppercase tracking-[0.1em] text-white/45">
                {guide.website} · Last verified {guide.last_verified}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <DifficultyBadge difficulty={guide.difficulty} dark />
                <DifficultyMeter difficulty={guide.difficulty} dark />
                <span className={`border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.08em] ${conf.cls}`}>{conf.label}</span>
              </div>
            </div>
            <button onClick={handleShare} className="btn-light btn-sm">
              {copied ? '✓ Link copied' : <>Share <span className="arr">↗</span></>}
            </button>
          </div>

          <p className="animate-fade-up mt-8 max-w-3xl text-lg leading-relaxed text-white/70" style={{ animationDelay: '100ms' }}>
            {guide.summary}
          </p>

          <div className="animate-fade-up mt-10 grid grid-cols-2 gap-px border border-white/15 bg-white/15 sm:grid-cols-4" style={{ animationDelay: '180ms' }}>
            {[
              { label: 'Setup time', value: guide.setup_time_estimate },
              { label: 'Approval wait', value: guide.approval_time_estimate },
              { label: 'Review required', value: guide.requires_approval ? 'Yes' : 'No' },
              { label: 'Agent automation', value: `${agentSteps} / ${steps.length} steps` },
            ].map((m) => (
              <div key={m.label} className="bg-ink p-5 transition-colors hover:bg-ink-raised">
                <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-white/40">{m.label}</p>
                <p className="mt-2 text-lg font-medium">{m.value}</p>
              </div>
            ))}
          </div>

          {guide.composio_managed_auth && (
            <div className="animate-fade-up mt-6 flex items-start gap-4 border border-brand-300/30 bg-brand/15 p-5" style={{ animationDelay: '240ms' }}>
              <span className="text-2xl">⚡</span>
              <div>
                <p className="font-semibold">Composio managed auth available</p>
                <p className="mt-1 text-sm text-white/70">
                  Prototype immediately with Composio&apos;s managed OAuth app — no setup needed. Switch to your own app when going to production.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ───────── Section nav + progress ───────── */}
      <div className="sticky top-16 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-6 overflow-x-auto px-4 sm:px-6">
          {SECTIONS.filter((s) => sectionVisible(s.id)).map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`relative flex-none py-4 font-mono text-xs uppercase tracking-[0.08em] transition-colors ${
                active === s.id ? 'text-ink' : 'text-zinc-400 hover:text-ink'
              }`}
            >
              {s.label}
              <span className={`absolute inset-x-0 -bottom-px h-0.5 bg-brand transition-transform duration-300 ${active === s.id ? 'scale-x-100' : 'scale-x-0'}`} />
            </a>
          ))}
          <div className="ml-auto hidden flex-none items-center gap-3 sm:flex">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-zinc-400">{doneSteps}/{steps.length} done</span>
            <div className="h-1 w-28 bg-zinc-200">
              <div className="h-full bg-brand transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        {/* Key facts */}
        {guide.key_facts?.length > 0 && (
          <Reveal>
            <div className="mb-20 bg-ink p-8 text-white sm:p-10">
              <p className="eyebrow-dark mb-5">Key facts</p>
              <ul className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
                {guide.key_facts.map((fact, i) => (
                  <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-white/75">
                    <span className="mt-0.5 flex-none font-mono text-brand-300">→</span>
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        )}

        {/* Steps */}
        <section className="mb-20">
          <SectionTitle id="steps" eyebrow="Step by step" title="Your setup walkthrough" />
          <div className="mb-8 flex flex-wrap gap-6 font-mono text-[11px] uppercase tracking-[0.08em] text-zinc-500">
            <span><span className="text-brand">⚡</span> Agent handles {agentSteps}</span>
            <span>👤 You handle {steps.length - agentSteps}</span>
            <span className="text-zinc-400">Click a number to mark a step done</span>
          </div>
          <div>
            {steps.map((step, i) => (
              <Reveal key={step.number} delay={Math.min(i, 4) * 50}>
                <StepCard
                  step={step}
                  done={!!checked[`step-${step.number}`]}
                  onToggle={() => toggle(`step-${step.number}`)}
                  isLast={i === steps.length - 1}
                />
              </Reveal>
            ))}
          </div>
        </section>

        {/* Requirements */}
        <section className="mb-20">
          <SectionTitle id="requirements" eyebrow="Before you start" title="Requirements checklist" />
          <Reveal>
            <div className="border border-zinc-200 bg-white p-6 sm:p-8">
              <p className="mb-6 text-sm text-zinc-500">
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-zinc-400">Account · </span>
                {req.account_type}. Tick off what you already have ready.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { key: 'needs_live_website',     label: 'Live public website' },
                  { key: 'needs_privacy_policy',   label: 'Privacy policy' },
                  { key: 'needs_terms_of_service', label: 'Terms of service' },
                  { key: 'needs_video_demo',       label: 'Video demo of the OAuth flow' },
                  { key: 'needs_security_audit',   label: 'Security audit (CASA / CAIQ)' },
                ].map(({ key, label }) => {
                  const needed = req[key as keyof typeof req] as boolean;
                  const isChecked = !!checked[key];
                  return (
                    <label
                      key={key}
                      className={`flex items-center gap-3 border p-4 transition-all duration-200 ${
                        needed
                          ? isChecked
                            ? 'cursor-pointer border-emerald-300 bg-emerald-50'
                            : 'cursor-pointer border-amber-300 bg-amber-50 hover:border-amber-500'
                          : 'border-zinc-100 bg-zinc-50'
                      }`}
                    >
                      {needed ? (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggle(key)}
                          className="h-4 w-4 accent-brand"
                          aria-label={`${label} ready`}
                        />
                      ) : (
                        <span className="w-4 text-center text-emerald-500">✓</span>
                      )}
                      <span className={`text-sm ${needed ? 'font-medium text-ink' : 'text-zinc-400'} ${isChecked ? 'line-through opacity-60' : ''}`}>
                        {label}
                        <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.08em] text-zinc-400">
                          {needed ? 'Required' : 'Not required'}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>

              {(req.allowed_scopes?.length > 0 || req.restricted_scopes?.length > 0) && (
                <div className="mt-8 space-y-6 border-t border-zinc-200 pt-6">
                  {req.allowed_scopes?.length > 0 && (
                    <div>
                      <p className="eyebrow mb-3">Common scopes</p>
                      <div className="flex flex-wrap gap-2">
                        {req.allowed_scopes.map((s) => (
                          <code key={s} className="border border-emerald-200 bg-emerald-50 px-2 py-1 font-mono text-xs text-emerald-800">{s}</code>
                        ))}
                      </div>
                    </div>
                  )}
                  {req.restricted_scopes?.length > 0 && (
                    <div>
                      <p className="eyebrow mb-3">Restricted scopes — need extra approval</p>
                      <div className="flex flex-wrap gap-2">
                        {req.restricted_scopes.map((s) => (
                          <code key={s} className="border border-red-200 bg-red-50 px-2 py-1 font-mono text-xs text-red-800">{s}</code>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Reveal>
        </section>

        {/* Blockers */}
        {guide.blockers?.length > 0 && (
          <section className="mb-20">
            <SectionTitle id="blockers" eyebrow="Watch out" title="Known blockers & gotchas" />
            <div className="space-y-4">
              {guide.blockers.map((b, i) => (
                <Reveal key={i} delay={Math.min(i, 3) * 70}>
                  <BlockerCard blocker={b} />
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {/* Agent log */}
        {guide.agent_actions?.length > 0 && (
          <section className="mb-20">
            <SectionTitle id="agent" eyebrow="Transparency" title="What the agent did" />
            <Reveal>
              <div className="overflow-hidden border border-ink bg-ink text-white">
                <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                  <span className="ml-3 font-mono text-[11px] uppercase tracking-[0.1em] text-white/40">research-log</span>
                </div>
                <div className="space-y-4 p-5 font-mono text-[13px]">
                  {guide.agent_actions.map((a, i) => (
                    <div key={i} className="flex gap-3">
                      <span className={a.status === 'done' ? 'text-emerald-400' : a.status === 'partial' ? 'text-amber-300' : 'text-red-400'}>
                        {a.status === 'done' ? '✓' : a.status === 'partial' ? '◐' : '✕'}
                      </span>
                      <div>
                        <p className="text-white">{a.action}</p>
                        <p className="mt-1 leading-relaxed text-white/50">{a.result}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </section>
        )}

        {/* Sources */}
        {guide.sources?.length > 0 && (
          <section>
            <SectionTitle id="sources" eyebrow="Evidence" title="Sources & confidence" />
            <Reveal>
              <div className="border border-zinc-200">
                {guide.sources.map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 border-b border-zinc-200 p-4 transition-colors last:border-b-0 hover:bg-zinc-50"
                  >
                    <span className="w-28 flex-none border border-zinc-200 px-2 py-1 text-center font-mono text-[10px] uppercase tracking-[0.06em] text-zinc-500">
                      {s.type === 'official_docs' ? 'Official docs' : s.type === 'community' ? 'Community' : 'Inferred'}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium group-hover:text-brand">{s.title}</span>
                    <span className="text-zinc-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand">↗</span>
                  </a>
                ))}
              </div>
              <p className="mt-4 text-xs text-zinc-400">
                Always verify against the provider&apos;s own documentation before going to production.
              </p>
            </Reveal>
          </section>
        )}
      </div>
    </div>
  );
}
