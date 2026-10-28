'use client';

import { useState } from 'react';
import type { EndpointProbe, OAuthGuide } from '@/lib/types';
import { API_URL } from '@/lib/api';
import { download } from '@/lib/share';

const OUTCOME: Record<string, { label: string; cls: string }> = {
  rejects_client: { label: 'Live · rejects invalid request', cls: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
  login_first:    { label: 'Live · sign-in first',          cls: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
  reachable:      { label: 'Live · responds',               cls: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
  blocked:        { label: 'Up · blocks bots',              cls: 'border-amber-300 bg-amber-50 text-amber-800' },
  down:           { label: 'Not reachable',                 cls: 'border-red-300 bg-red-50 text-red-800' },
  skipped:        { label: 'Skipped',                       cls: 'border-zinc-300 bg-zinc-50 text-zinc-700' },
};

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch {}
      }}
      className="btn-outline btn-sm flex-none"
    >
      {done ? '✓ Copied' : label}
    </button>
  );
}

export default function SetupKit({ guide }: { guide: OAuthGuide }) {
  const kit = guide.setup_kit;
  const eps = guide.oauth_endpoints;
  const [probe, setProbe] = useState<{ results: EndpointProbe[]; at: string } | null>(null);
  const [probing, setProbing] = useState(false);
  const [probeError, setProbeError] = useState('');

  const runProbe = async () => {
    if (!eps) return;
    setProbing(true);
    setProbeError('');
    try {
      const res = await fetch(`${API_URL}/api/probe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorization_url: eps.authorization_url, token_url: eps.token_url || undefined }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(typeof e.detail === 'string' ? e.detail : 'Probe failed');
      }
      const data = await res.json();
      setProbe({ results: data.results, at: new Date().toLocaleTimeString() });
    } catch (e) {
      setProbeError(e instanceof Error ? e.message : 'Probe failed');
    } finally {
      setProbing(false);
    }
  };

  if (!kit && !eps) return null;

  return (
    <div className="space-y-6">
      {kit && (
        <div className="border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 p-5">
            <p className="font-semibold">Ready-to-paste values</p>
            <p className="mt-1 text-sm text-zinc-500">Prepared for this provider — copy them straight into the registration form.</p>
          </div>
          <div className="divide-y divide-zinc-200">
            {kit.values.map((v) => (
              <div key={v.label} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-zinc-500">{v.label}</p>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all bg-zinc-50 p-3 font-mono text-xs text-ink">{v.value}</pre>
                  {v.hint && <p className="mt-2 text-xs text-zinc-500">{v.hint}</p>}
                </div>
                <CopyButton text={v.value} />
              </div>
            ))}
          </div>

          {(kit.links.length > 0 || kit.files.length > 0) && (
            <div className="space-y-4 border-t border-zinc-200 p-5">
              <div className="flex flex-wrap gap-2">
                {kit.links.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="btn-black btn-sm">
                    {l.label} <span className="arr">↗</span>
                  </a>
                ))}
              </div>
              {kit.files.map((f) => (
                <div key={f.filename} className="border border-zinc-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="font-mono text-xs">{f.filename}</code>
                    <span className="ml-auto flex gap-2">
                      <CopyButton text={f.content} />
                      <button type="button" onClick={() => download(f.filename, f.content, f.mime)} className="btn-outline btn-sm">Download</button>
                    </span>
                  </div>
                  {f.note && <p className="mt-2 text-xs text-zinc-500">{f.note}</p>}
                  <pre className="mt-3 max-h-56 overflow-auto bg-ink p-3 font-mono text-xs text-white/80">{f.content}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {eps && (
        <div className="border border-zinc-200 bg-white">
          <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 p-5">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Live endpoint check</p>
              <p className="mt-1 text-sm text-zinc-500">
                The agent sends deliberately invalid OAuth requests to the provider&apos;s real endpoints to confirm they are up and that registration is enforced. No account or credentials involved.
              </p>
            </div>
            <button type="button" onClick={runProbe} disabled={probing} className="btn-black btn-sm disabled:opacity-50">
              {probing ? 'Testing…' : probe ? 'Run again' : <>Run live check <span className="arr">→</span></>}
            </button>
          </div>
          <div className="space-y-px bg-zinc-200">
            {[
              { kind: 'authorization', url: eps.authorization_url },
              ...(eps.token_url ? [{ kind: 'token', url: eps.token_url }] : []),
            ].map((e) => {
              const r = probe?.results.find((x) => x.endpoint === e.kind);
              const o = r ? OUTCOME[r.outcome] : null;
              return (
                <div key={e.kind} className="flex flex-col gap-2 bg-white p-4 sm:flex-row sm:items-center">
                  <span className="w-28 flex-none font-mono text-[11px] uppercase tracking-[0.1em] text-zinc-500">{e.kind}</span>
                  <code className="min-w-0 flex-1 break-all text-xs">{e.url}</code>
                  {o && r ? (
                    <span className={`animate-pop border px-2.5 py-1 text-xs ${o.cls}`} title={r.detail}>{o.label}</span>
                  ) : (
                    <span className="text-xs text-zinc-400">{probing ? 'testing…' : 'not tested yet'}</span>
                  )}
                </div>
              );
            })}
          </div>
          {probe && (
            <div className="space-y-1 border-t border-zinc-200 p-4 text-xs text-zinc-500">
              {probe.results.map((r) => (
                <p key={r.endpoint}><span className="font-mono uppercase">{r.endpoint}</span> — {r.detail}</p>
              ))}
              <p className="text-zinc-400">Tested at {probe.at}</p>
            </div>
          )}
          {probeError && <p className="border-t border-zinc-200 p-4 text-sm text-red-600">{probeError}</p>}
        </div>
      )}
    </div>
  );
}
