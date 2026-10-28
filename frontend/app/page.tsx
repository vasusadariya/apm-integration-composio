'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { fetchAllGuides } from '@/lib/api';
import { shortName, type GuideCard } from '@/lib/types';
import GlitchBars from '@/components/GlitchBars';
import Reveal from '@/components/Reveal';
import CountUp from '@/components/CountUp';
import AppLogo from '@/components/AppLogo';
import DifficultyBadge, { DifficultyMeter } from '@/components/DifficultyBadge';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
  { key: 'very_hard', label: 'Very Hard' },
];

// ─── App card with cursor-follow spotlight ───────────────────────────────────
function AppCard({ guide }: { guide: GuideCard }) {
  const onMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  return (
    <Link
      href={`/guide/${guide.slug}`}
      onMouseMove={onMove}
      className="spot group flex h-full flex-col gap-5 p-6"
    >
      <div className="flex items-start gap-4">
        <AppLogo src={guide.logo_url} name={guide.app} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold">{shortName(guide.app)}</h3>
          <p className="truncate font-mono text-[11px] uppercase tracking-[0.08em] text-zinc-400">{guide.website}</p>
        </div>
        <span className="font-mono text-lg text-zinc-300 transition-all duration-200 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-brand">↗</span>
      </div>

      <div className="flex items-center justify-between">
        <DifficultyBadge difficulty={guide.difficulty} />
        <DifficultyMeter difficulty={guide.difficulty} />
      </div>

      <p className="line-clamp-3 text-sm leading-relaxed text-zinc-600">{guide.summary}</p>

      <div className="mt-auto grid grid-cols-2 gap-px border border-zinc-200 bg-zinc-200 font-mono text-[11px] uppercase tracking-[0.06em]">
        <div className="bg-white p-3">
          <p className="text-zinc-400">Setup</p>
          <p className="mt-1 text-ink" title={guide.setup_time_estimate}>{shortName(guide.setup_time_estimate)}</p>
        </div>
        <div className="bg-white p-3">
          <p className="text-zinc-400">Approval</p>
          <p className="mt-1 text-ink" title={guide.approval_time_estimate}>{shortName(guide.approval_time_estimate)}</p>
        </div>
      </div>

      {guide.composio_managed_auth && (
        <p className="-mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-brand">⚡ Composio managed auth</p>
      )}
    </Link>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [guides, setGuides] = useState<GuideCard[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLElement>(null);

  useEffect(() => {
    fetchAllGuides()
      .then(setGuides)
      .catch(() => setError('Could not connect to the guide API. Make sure the backend is running.'))
      .finally(() => setLoading(false));
  }, []);

  // Press "/" anywhere to jump into search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return guides.filter(
      (g) =>
        (filter === 'all' || g.difficulty === filter) &&
        (!q || g.app.toLowerCase().includes(q) || g.website.toLowerCase().includes(q)),
    );
  }, [guides, query, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: guides.length };
    guides.forEach((g) => (c[g.difficulty] = (c[g.difficulty] ?? 0) + 1));
    return c;
  }, [guides]);

  const scrollToLibrary = () =>
    libraryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div>
      {/* ───────── Hero ───────── */}
      <section className="relative overflow-hidden bg-ink text-white">
        <GlitchBars />
        <div className="grid-bg absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-4 pb-24 pt-36 text-center sm:px-6 sm:pt-44">
          <div className="animate-fade-up inline-flex items-center gap-3 border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-white/80 backdrop-blur">
            <span className="bg-brand px-1.5 py-0.5 text-white">New</span>
            AI agent researches any provider live
          </div>

          <h1
            className="animate-fade-up mt-8 text-[2.6rem] font-medium leading-[1.05] [text-shadow:0_2px_24px_rgba(0,0,0,0.6)] sm:text-6xl lg:text-7xl"
            style={{ animationDelay: '80ms' }}
          >
            Know exactly what it takes to set up <span className="hl">OAuth</span> for any app
          </h1>

          <p
            className="animate-fade-up mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-white/60"
            style={{ animationDelay: '160ms' }}
          >
            Difficulty, timelines, approval requirements and the blockers nobody warns you about —
            before you write a single line of integration code.
          </p>

          {/* Search */}
          <div className="animate-fade-up mx-auto mt-10 max-w-xl" style={{ animationDelay: '240ms' }}>
            <div className="group relative">
              <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40 transition-colors group-focus-within:text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
              </svg>
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (e.target.value.length === 1) scrollToLibrary();
                }}
                placeholder="Search GitHub, Slack, Google…"
                className="dark-field py-4 pl-12 pr-14 text-base"
                aria-label="Search guides"
              />
              <kbd className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 border border-white/20 px-2 py-0.5 font-mono text-xs text-white/50">/</kbd>
            </div>
          </div>

          <div className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: '320ms' }}>
            <button onClick={scrollToLibrary} className="btn-light">
              Browse the library <span className="arr">→</span>
            </button>
            <Link href="/generate" className="btn-ghost">
              Generate a guide <span className="arr">→</span>
            </Link>
          </div>
        </div>

        {/* App marquee */}
        {guides.length > 0 && (
          <div className="relative border-t border-white/10 py-7">
            <p className="eyebrow-dark mb-5 text-center">Guides ready for</p>
            <div
              className="overflow-hidden"
              style={{
                maskImage: 'linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)',
                WebkitMaskImage: 'linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)',
              }}
            >
              <div className="flex w-max animate-marquee gap-12 hover:[animation-play-state:paused]">
                {[...guides, ...guides].map((g, i) => (
                  <Link
                    key={`${g.slug}-${i}`}
                    href={`/guide/${g.slug}`}
                    className="flex items-center gap-3 text-white/50 transition-colors hover:text-white"
                  >
                    <AppLogo src={g.logo_url} name={g.app} size={28} />
                    <span className="text-2xl font-semibold tracking-tight">{shortName(g.app)}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ───────── Stats ───────── */}
      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-zinc-200 sm:grid-cols-4">
          {[
            { n: guides.length, label: 'Provider guides' },
            { n: guides.filter((g) => g.requires_approval).length, label: 'Need a review' },
            { n: guides.filter((g) => g.difficulty === 'easy').length, label: 'Done in an hour' },
            { n: guides.filter((g) => g.composio_managed_auth).length, label: 'Composio managed auth' },
          ].map((s) => (
            <div key={s.label} className="px-6 py-8">
              <p className="text-4xl font-medium tracking-tight">
                {loading ? '–' : <CountUp to={s.n} />}
              </p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-zinc-400">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── Library ───────── */}
      <section ref={libraryRef} id="library" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6 lg:px-8">
        <Reveal>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow mb-3">The library</p>
              <h2 className="text-4xl font-medium sm:text-5xl">
                Pick a provider, <span className="text-brand">see the plan</span>
              </h2>
            </div>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by difficulty">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  role="tab"
                  aria-selected={filter === f.key}
                  onClick={() => setFilter(f.key)}
                  className={`border px-3.5 py-2 font-mono text-xs uppercase tracking-[0.06em] transition-all ${
                    filter === f.key
                      ? 'border-ink bg-ink text-white'
                      : 'border-zinc-300 bg-white text-zinc-600 hover:border-ink hover:text-ink'
                  }`}
                >
                  {f.label}
                  <span className={`ml-2 ${filter === f.key ? 'text-white/60' : 'text-zinc-400'}`}>{counts[f.key] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        <div className="mt-10">
          {loading && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="shimmer h-[22rem] border border-zinc-200" />
              ))}
            </div>
          )}

          {error && (
            <div className="border border-red-200 bg-red-50 p-8 text-center">
              <p className="font-medium text-red-700">⚠️ {error}</p>
              <p className="mt-2 text-sm text-red-600">
                Start it with{' '}
                <code className="bg-red-100 px-2 py-0.5 font-mono">cd backend &amp;&amp; uvicorn main:app --reload --port 8000</code>
              </p>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="pale-card border border-zinc-200 px-6 py-16 text-center">
              <p className="text-2xl font-medium">No guide for &quot;{query}&quot; yet</p>
              <p className="mt-2 text-zinc-600">Our agent can research it for you in about a minute.</p>
              <Link href={`/generate?app=${encodeURIComponent(query)}`} className="btn-black mt-6">
                Generate a guide for {query || 'this app'} <span className="arr">→</span>
              </Link>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((g, i) => (
                <Reveal key={g.slug} delay={(i % 3) * 80} className="h-full">
                  <AppCard guide={g} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ───────── How it works ───────── */}
      <section className="border-t border-zinc-200 bg-zinc-50/60">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="eyebrow mb-3">How it works</p>
              <h2 className="text-4xl font-medium sm:text-5xl">
                Stop discovering blockers <span className="text-brand">mid-launch</span>
              </h2>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {[
              { n: '01', t: 'Look it up', d: 'Search the library for the provider you need to connect, or filter by how painful you can afford it to be.', v: ['GitHub  → instant', 'Slack   → 1–7 days', 'Google  → 4–6 weeks'] },
              { n: '02', t: 'Read the plan', d: 'Step-by-step setup, requirements you can tick off, known blockers, and exactly what an agent can automate.', v: ['☑ Privacy policy', '☑ Live website', '☐ Security audit'] },
              { n: '03', t: 'Generate any app', d: 'Not in the library? Our research agent searches the docs live and builds the same structured guide for you.', v: ['> searching docs…', '> extracting scopes…', '> guide ready ✓'] },
            ].map((c, i) => (
              <Reveal key={c.n} delay={i * 100}>
                <div className="pale-card group h-full overflow-hidden border border-brand-200/60 p-7 transition-transform duration-300 hover:-translate-y-1">
                  <p className="font-mono text-xs tracking-[0.1em] text-brand">{c.n}</p>
                  <h3 className="mt-3 text-2xl font-medium">{c.t}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600">{c.d}</p>
                  <div className="mt-6 space-y-1.5 border border-white/70 bg-white/80 p-4 font-mono text-xs text-zinc-700 shadow-sm backdrop-blur transition-transform duration-300 group-hover:translate-x-1">
                    {c.v.map((l) => (
                      <p key={l} className="whitespace-pre">{l}</p>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── CTA ───────── */}
      <section className="relative overflow-hidden bg-ink text-white">
        <GlitchBars intensity="soft" />
        <Reveal>
          <div className="relative mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
            <h2 className="text-4xl font-medium sm:text-5xl">
              Don&apos;t see your app? <span className="hl">Generate it</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-white/60">
              Paste any app name or URL. Watch the agent research the docs and assemble a shareable guide in real time.
            </p>
            <Link href="/generate" className="btn-light mt-9">
              Generate a guide <span className="arr">→</span>
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
