'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import type { OAuthGuide } from '@/lib/types';
import { API_URL } from '@/lib/api';
import GuideDetail from '@/components/GuideDetail';

type SSEEvent =
  | { type: 'status'; message: string }
  | { type: 'guide'; data: OAuthGuide }
  | { type: 'done'; message: string }
  | { type: 'error'; message: string }
  | { type: 'raw'; text: string };

export default function GeneratePage() {
  const [appName, setAppName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessages, setStatusMessages] = useState<string[]>([]);
  const [guide, setGuide] = useState<OAuthGuide | null>(null);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const handleGenerate = async () => {
    if (!appName.trim()) return;

    // Reset state
    setIsGenerating(true);
    setStatusMessages([]);
    setGuide(null);
    setError('');

    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${API_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_name: appName, website_url: websiteUrl || undefined }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Generation failed');
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event: SSEEvent = JSON.parse(line.slice(6));
            if (event.type === 'status') {
              setStatusMessages(prev => [...prev, event.message]);
            } else if (event.type === 'guide') {
              setGuide(event.data);
            } else if (event.type === 'error') {
              setError(event.message);
            }
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-2">
        <Link href="/" className="text-sm text-blue-600 hover:underline">← All guides</Link>
      </div>
      <div className="text-center py-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
          Generate an OAuth Guide
        </h1>
        <p className="text-slate-600 max-w-xl mx-auto text-lg">
          Enter any app name or website. The AI agent will research the OAuth setup process
          and generate a complete guide in real time.
        </p>
      </div>

      {/* Input Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              App Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Stripe, Figma, Shopify, Asana..."
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleGenerate()}
              disabled={isGenerating}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Website URL <span className="text-slate-400 font-normal">(optional — helps accuracy)</span>
            </label>
            <input
              type="url"
              placeholder="e.g. https://stripe.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              disabled={isGenerating}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:cursor-not-allowed"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={!appName.trim() || isGenerating}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-base"
          >
            {isGenerating ? '🔍 Researching...' : '🚀 Generate Guide'}
          </button>
        </div>
      </div>

      {/* Agent Activity Stream */}
      {(isGenerating || statusMessages.length > 0) && !guide && (
        <div className="bg-slate-900 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-slate-300 text-sm font-medium">Agent researching...</span>
          </div>
          <div className="space-y-2">
            {statusMessages.map((msg, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-green-400">✓</span>
                <span className="text-slate-300">{msg}</span>
              </div>
            ))}
            {isGenerating && (
              <div className="flex items-center gap-2 text-sm streaming-cursor">
                <span className="text-blue-400">→</span>
                <span className="text-slate-400">Searching provider documentation</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700 font-medium">❌ {error}</p>
          {error.includes('backend') || error.includes('GEMINI') ? (
            <p className="text-red-600 text-sm mt-1">
              Make sure the backend is running and <code className="bg-red-100 px-1 rounded">GEMINI_API_KEY</code> is set in <code className="bg-red-100 px-1 rounded">backend/.env</code>
            </p>
          ) : null}
        </div>
      )}

      {/* Generated Guide */}
      {guide && (
        <div>
          <div className="flex items-center justify-between -mb-4">
            <h2 className="text-lg font-bold text-slate-900">✨ Generated Guide</h2>
            <Link href={`/guide/${guide.slug}`} className="text-sm text-blue-600 hover:underline">
              Open shareable page →
            </Link>
          </div>
          <GuideDetail guide={guide} shareUrl={`${window.location.origin}/guide/${guide.slug}`} />
          <p className="text-xs text-center text-slate-400 mt-4">
            Generated by Gemini with Google Search grounding · Always verify against provider docs
          </p>
        </div>
      )}

      {/* How it works */}
      {!isGenerating && !guide && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
          {[
            { icon: '🔍', title: 'Searches provider docs', desc: 'The agent uses Google Search to find the official developer portal and OAuth documentation' },
            { icon: '📋', title: 'Extracts requirements', desc: 'Identifies scopes, approval steps, timelines, prerequisites, and known blockers' },
            { icon: '📄', title: 'Builds a structured guide', desc: 'Formats findings into a developer-ready guide with difficulty rating and step-by-step instructions' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <div className="text-3xl mb-2">{icon}</div>
              <h3 className="font-semibold text-slate-800 text-sm mb-1">{title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

