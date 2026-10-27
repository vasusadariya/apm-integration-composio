'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchAllGuides } from '@/lib/api';
import type { GuideCard } from '@/lib/types';

// ─── Difficulty Badge ─────────────────────────────────────────────────────────
function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const config = {
    easy:      { label: '🟢 Easy',       bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
    medium:    { label: '🟡 Medium',     bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    hard:      { label: '🟠 Hard',       bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    very_hard: { label: '🔴 Very Hard',  bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
  }[difficulty] ?? { label: difficulty, bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
      {config.label}
    </span>
  );
}

// ─── App Card ─────────────────────────────────────────────────────────────────
function AppCard({ guide }: { guide: GuideCard }) {
  return (
    <Link
      href={`/guide/${guide.slug}`}
      className="group bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col gap-3"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={guide.logo_url}
            alt={guide.app}
            className="w-8 h-8 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
            {guide.app}
          </h3>
          <p className="text-xs text-slate-500">{guide.website}</p>
        </div>
        <DifficultyBadge difficulty={guide.difficulty} />
      </div>

      {/* Summary */}
      <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
        {guide.summary}
      </p>

      {/* Meta */}
      <div className="flex flex-wrap gap-2 mt-auto pt-2 border-t border-slate-100">
        <span className="text-xs text-slate-500 flex items-center gap-1">
          ⏱ {guide.setup_time_estimate}
        </span>
        {guide.requires_approval && (
          <span className="text-xs text-amber-600 flex items-center gap-1">
            📋 Review required
          </span>
        )}
        {guide.composio_managed_auth && (
          <span className="text-xs text-blue-600 flex items-center gap-1">
            ⚡ Composio managed auth
          </span>
        )}
      </div>
    </Link>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [guides, setGuides] = useState<GuideCard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAllGuides()
      .then(setGuides)
      .catch(() => setError('Could not connect to the guide API. Make sure the backend is running.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredGuides = guides.filter((g) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return g.app.toLowerCase().includes(q) || g.website.toLowerCase().includes(q);
  });

  const byDifficulty = {
    easy:      filteredGuides.filter(g => g.difficulty === 'easy'),
    medium:    filteredGuides.filter(g => g.difficulty === 'medium'),
    hard:      filteredGuides.filter(g => g.difficulty === 'hard'),
    very_hard: filteredGuides.filter(g => g.difficulty === 'very_hard'),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="py-16 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <span>⚡</span>
          <span>Built for AI agent developers using Composio</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4 leading-tight">
          OAuth Setup Guides
          <br />
          <span className="text-blue-600">for any provider</span>
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8 leading-relaxed">
          Know exactly how hard it is to set up OAuth, how long approval takes,
          and what could block you — before you start.
        </p>

        {/* Search */}
        <div className="relative max-w-lg mx-auto mb-4">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search apps... (GitHub, Slack, Google...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-base"
          />
        </div>
        <p className="text-sm text-slate-500">
          Don&apos;t see your app?{' '}
          <Link href="/generate" className="text-blue-600 hover:underline font-medium">
            Generate a guide with AI →
          </Link>
        </p>
      </div>

      {/* Difficulty legend */}
      <div className="flex flex-wrap gap-4 items-center justify-center mb-10">
        {[
          { key: 'easy',      label: '🟢 Easy',      time: '30–60 min, instant approval' },
          { key: 'medium',    label: '🟡 Medium',    time: '1–3 hrs, 1–7 day review' },
          { key: 'hard',      label: '🟠 Hard',      time: '2–6 hrs, 1–4 week review' },
          { key: 'very_hard', label: '🔴 Very Hard', time: 'Days of work, 4–6 week audit' },
        ].map((d) => (
          <div key={d.key} className="text-sm text-slate-600">
            <span className="font-medium">{d.label}</span>
            <span className="text-slate-400 ml-1.5">{d.time}</span>
          </div>
        ))}
      </div>

      {/* Content */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 h-48 shimmer" />
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium">⚠️ {error}</p>
          <p className="text-red-600 text-sm mt-1">
            Start the backend: <code className="bg-red-100 px-2 py-0.5 rounded font-mono">cd backend &amp;&amp; uvicorn main:app --reload</code>
          </p>
        </div>
      )}

      {!loading && !error && filteredGuides.length === 0 && (
        <div className="text-center py-16">
          <p className="text-slate-500 text-lg">No guides found for &quot;{searchQuery}&quot;</p>
          <Link href="/generate" className="mt-4 inline-block text-blue-600 hover:underline font-medium">
            Generate a guide for this app →
          </Link>
        </div>
      )}

      {!loading && !error && filteredGuides.length > 0 && (
        <div className="space-y-10 pb-16">
          {Object.entries(byDifficulty).map(([diff, items]) => {
            if (items.length === 0) return null;
            const labels: Record<string, string> = {
              easy:      '🟢 Easy — Get going in under an hour',
              medium:    '🟡 Medium — A few hours + short review',
              hard:      '🟠 Hard — Multiple days, plan ahead',
              very_hard: '🔴 Very Hard — Budget weeks and possibly money',
            };
            return (
              <section key={diff}>
                <h2 className="text-lg font-semibold text-slate-700 mb-4">{labels[diff]}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((guide) => (
                    <AppCard key={guide.slug} guide={guide} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
