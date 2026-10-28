'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { OAuthGuide } from '@/lib/types';
import { API_URL } from '@/lib/api';
import GuideDetail from '@/components/GuideDetail';
import GlitchBars from '@/components/GlitchBars';

type SSEEvent = { ts?: number } & (
  | { type: 'status'; message: string }
  | { type: 'guide'; data: OAuthGuide }
  | { type: 'done'; message: string }
  | { type: 'error'; message: string }
);

const DRAFT_KEY = 'generate-draft';

const EXAMPLES = ['Stripe', 'Figma', 'Shopify', 'Asana', 'Linear', 'Discord'];

function GeneratePageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const jobParam = params.get('job');

  const [appName, setAppName] = useState(params.get('app') ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(params.get('url') ?? '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessages, setStatusMessages] = useState<string[]>([]);
  const [guide, setGuide] = useState<OAuthGuide | null>(null);
  const [error, setError] = useState('');
  const [reconnecting, setReconnecting] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null); // server epoch ms
  const [elapsed, setElapsed] = useState(0);
  const sourceRef = useRef<EventSource | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Restore an unsent draft (only when there is no job in the URL)
  useEffect(() => {
    if (jobParam || params.get('app')) return;
    try {
      const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
      if (d.appName) setAppName(d.appName);
      if (d.websiteUrl) setWebsiteUrl(d.websiteUrl);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ appName, websiteUrl })); } catch {}
  }, [appName, websiteUrl]);

  // Elapsed time is derived from the server's start time, so it survives refreshes.
  useEffect(() => {
    if (!isGenerating || startedAt == null) return;
    const tick = () => setElapsed(Math.max(0, Math.round((Date.now() - startedAt) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [isGenerating, startedAt]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [statusMessages]);

  const closeStream = () => {
    sourceRef.current?.close();
    sourceRef.current = null;
  };

  // Follow a job: the server replays every event from the start, so a refreshed page
  // rebuilds exactly the state it had and then keeps following live.
  const followJob = (jobId: string) => {
    closeStream();
    setIsGenerating(true);
    setStatusMessages([]);
    setGuide(null);
    setError('');
    setStartedAt(null);

    const es = new EventSource(`${API_URL}/api/jobs/${jobId}/events`);
    sourceRef.current = es;

    es.onopen = () => setReconnecting(false);
    es.onmessage = (msg) => {
      setReconnecting(false);
      let event: SSEEvent;
      try { event = JSON.parse(msg.data); } catch { return; }
      if (event.ts) setStartedAt((prev) => prev ?? event.ts! * 1000);

      if (event.type === 'status') {
        setStatusMessages((p) => [...p, event.message]);
      } else if (event.type === 'guide') {
        setGuide(event.data);
      } else if (event.type === 'error') {
        setError(event.message);
        setIsGenerating(false);
        closeStream();
      } else if (event.type === 'done') {
        setIsGenerating(false);
        closeStream();
      }
    };
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        // Server answered with an error (e.g. 404: the session expired or the server restarted)
        closeStream();
        setIsGenerating(false);
        setError('This research session has expired (the server may have restarted). Please generate the guide again.');
        router.replace('/generate');
      } else {
        setReconnecting(true); // the browser retries automatically, resuming from the last event
      }
    };
  };

  // Resume on load / when the URL's job changes
  useEffect(() => {
    if (jobParam) followJob(jobParam);
    else { closeStream(); }
    return closeStream;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobParam]);

  const handleGenerate = async (nameOverride?: string) => {
    const name = (nameOverride ?? appName).trim();
    if (!name || isGenerating) return;

    setError('');
    setIsGenerating(true);
    try {
      const res = await fetch(`${API_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_name: name, website_url: websiteUrl || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          typeof err.detail === 'string' ? err.detail : res.status === 503
            ? 'The server is waking up or busy. Please try again in a few seconds.'
            : 'Generation failed',
        );
      }
      const { job_id } = await res.json();
      // Put the job in the URL: refreshing or sharing this tab resumes the same run.
      const q = new URLSearchParams({ job: job_id, app: name });
      if (websiteUrl) q.set('url', websiteUrl);
      router.replace(`/generate?${q.toString()}`);
    } catch (err: unknown) {
      setIsGenerating(false);
      setError(err instanceof Error ? err.message : 'Failed to start. Is the backend running?');
    }
  };

  const reset = () => {
    closeStream();
    setGuide(null);
    setStatusMessages([]);
    setError('');
    setIsGenerating(false);
    router.replace('/generate');
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

  const started = isGenerating || statusMessages.length > 0 || !!error || !!jobParam;

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
                {isGenerating && <span className="ml-auto font-mono text-[11px] text-white/40">{reconnecting ? 'reconnecting… ' : ''}{elapsed}s</span>}
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
                    <span className="text-white/40">{reconnecting ? 'connection lost — reconnecting' : 'working'}</span>
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
