'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { OAuthGuide } from '@/lib/types';
import { API_URL } from '@/lib/api';
import GuideDetail from '@/components/GuideDetail';
import GlitchBars from '@/components/GlitchBars';

type SSEEvent =
  | { type: 'status'; message: string }
  | { type: 'guide'; data: OAuthGuide }
  | { type: 'done'; message: string }
  | { type: 'error'; message: string }
  | { type: 'raw'; text: string };

const EXAMPLES = ['Stripe', 'Figma', 'Shopify', 'Asana', 'Linear', 'Discord'];

function GeneratePageInner() {
  const params = useSearchParams();
  const [appName, setAppName] = useState(params.get('app') ?? '');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessages, setStatusMessages] = useState<string[]>([]);
  const [guide, setGuide] = useState<OAuthGuide | null>(null);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isGenerating) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [isGenerating]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [statusMessages]);

  const handleGenerate = async (nameOverride?: string) => {
    const name = (nameOverride ?? appName).trim();
    if (!name || isGenerating) return;

    setIsGenerating(true);
    setStatusMessages([]);
    setGuide(null);
    setError('');
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${API_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_name: name, website_url: websiteUrl || undefined }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Generation failed');
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';

        for (const chunk of chunks) {
          if (!chunk.startsWith('data: ')) continue;
          try {
            const event: SSEEvent = JSON.parse(chunk.slice(6));
            if (event.type === 'status') setStatusMessages((p) => [...p, event.message]);
            else if (event.type === 'guide') setGuide(event.data);
            else if (event.type === 'error') setError(event.message);
          } catch {}
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message || 'Failed to generate guide. Is the backend running?');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    setGuide(null);
    setStatusMessages([]);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Result view ──
  if (guide) {
    return (
      <GuideDetail
        guide={guide}
        shareUrl={`${window.location.origin}/guide/${guide.slug}`}
        banner={
          <div className="animate-pop flex flex-wrap items-center justify-between gap-4 border border-brand-300/30 bg-brand/15 px-5 py-3">
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-white/90">
              ✨ Freshly generated · saved at <span className="text-brand-300">/guide/{guide.slug}</span>
            </p>
            <div className="flex gap-2">
              <Link href={`/guide/${guide.slug}`} className="btn-light btn-sm">Open shareable page <span className="arr">→</span></Link>
              <button onClick={reset} className="btn-ghost btn-sm">New guide</button>
            </div>
          </div>
        }
      />
    );
  }

  const started = isGenerating || statusMessages.length > 0 || !!error;

  return (
    <div>
      <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-ink text-white">
        <GlitchBars intensity={started ? 'soft' : 'full'} />
        <div className="grid-bg absolute inset-0" aria-hidden />

        <div className="relative mx-auto max-w-3xl px-4 pb-24 pt-32 sm:px-6 sm:pt-40">
          <div className="animate-fade-up text-center">
            <p className="eyebrow-dark mb-5">Live research agent</p>
            <h1 className="text-4xl font-medium leading-[1.05] sm:text-6xl">
              Generate an <span className="hl">OAuth guide</span> for anything
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-white/60">
              Enter any app. The agent searches the developer docs and builds a structured setup guide — live.
            </p>
          </div>

          {/* Form */}
          <div className="animate-fade-up mt-10 border border-white/15 bg-ink/70 p-5 backdrop-blur sm:p-7" style={{ animationDelay: '120ms' }}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="app" className="eyebrow-dark mb-2 block">App name *</label>
                <input
                  id="app"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                  disabled={isGenerating}
                  placeholder="e.g. Stripe"
                  className="dark-field disabled:opacity-50"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="url" className="eyebrow-dark mb-2 block">Website (optional)</label>
                <input
                  id="url"
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                  disabled={isGenerating}
                  placeholder="https://stripe.com"
                  className="dark-field disabled:opacity-50"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="eyebrow-dark mr-1">Try</span>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  disabled={isGenerating}
                  onClick={() => { setAppName(ex); handleGenerate(ex); }}
                  className="border border-white/15 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.06em] text-white/70 transition-all hover:border-brand-300 hover:bg-white/5 hover:text-white disabled:opacity-40"
                >
                  {ex}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleGenerate()}
              disabled={!appName.trim() || isGenerating}
              className="btn-light mt-6 w-full disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isGenerating ? 'Researching…' : <>Generate guide <span className="arr">→</span></>}
            </button>
          </div>

          {/* Agent terminal */}
          {started && (
            <div className="animate-fade-up mt-8 overflow-hidden border border-white/15 bg-black/60 backdrop-blur">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-3 font-mono text-[11px] uppercase tracking-[0.1em] text-white/40">agent — researching {appName}</span>
                {isGenerating && <span className="ml-auto font-mono text-[11px] text-white/40">{elapsed}s</span>}
              </div>

              {isGenerating && (
                <div className="relative h-px overflow-hidden bg-white/10">
                  <div className="absolute inset-y-0 w-1/4 animate-indeterminate bg-brand-300" />
                </div>
              )}

              <div className="max-h-80 space-y-2.5 overflow-y-auto p-5 font-mono text-[13px]">
                {statusMessages.map((m, i) => (
                  <div key={i} className="animate-line-in flex gap-3">
                    <span className="text-emerald-400">✓</span>
                    <span className="text-white/75">{m}</span>
                  </div>
                ))}
                {isGenerating && (
                  <div className="streaming-cursor flex gap-3">
                    <span className="text-brand-300">›</span>
                    <span className="text-white/40">working</span>
                  </div>
                )}
                <div ref={logEndRef} />
              </div>
            </div>
          )}

          {error && (
            <div className="animate-pop mt-6 border border-red-500/40 bg-red-500/10 p-5">
              <p className="font-medium text-red-300">✕ {error}</p>
              {(error.includes('backend') || error.includes('GEMINI')) && (
                <p className="mt-2 text-sm text-red-200/70">
                  Check the backend is running and <code className="bg-white/10 px-1.5 font-mono">GEMINI_API_KEY</code> is set in <code className="bg-white/10 px-1.5 font-mono">backend/.env</code>.
                </p>
              )}
            </div>
          )}

          {/* How it works */}
          {!started && (
            <div className="animate-fade-up mt-10 grid gap-px border border-white/15 bg-white/15 sm:grid-cols-3" style={{ animationDelay: '240ms' }}>
              {[
                { n: '01', t: 'Searches the docs', d: 'Finds the developer portal and official OAuth pages via Google Search.' },
                { n: '02', t: 'Extracts requirements', d: 'Scopes, approvals, timelines, prerequisites and blockers.' },
                { n: '03', t: 'Builds a guide', d: 'Same format as the library — with sources and a shareable link.' },
              ].map((c) => (
                <div key={c.n} className="bg-ink p-5 transition-colors hover:bg-ink-raised">
                  <p className="font-mono text-xs text-brand-300">{c.n}</p>
                  <p className="mt-2 font-semibold">{c.t}</p>
                  <p className="mt-1 text-sm text-white/50">{c.d}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink" />}>
      <GeneratePageInner />
    </Suspense>
  );
}
