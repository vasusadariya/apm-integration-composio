'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchGuide } from '@/lib/api';
import GuideDetail from '@/components/GuideDetail';
import { decodeGuide } from '@/lib/share';
import type { OAuthGuide } from '@/lib/types';

export default function GuidePage() {
  const routeParams = useParams();
  const slug = (routeParams?.slug as string) || '';
  const [guide, setGuide] = useState<OAuthGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    fetchGuide(slug)
      .then(setGuide)
      // The server may have lost a generated guide (ephemeral disk) — rebuild it from the share link.
      .catch(async () => {
        const fromLink = await decodeGuide(window.location.hash);
        if (fromLink) setGuide(fromLink);
        else setError('Guide not found, expired, or the backend is not running.');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="bg-ink pb-24 pt-32 text-white">
        <div className="mx-auto max-w-5xl space-y-5 px-4 sm:px-6">
          <div className="shimmer-dark h-5 w-28" />
          <div className="flex gap-6">
            <div className="shimmer-dark h-[72px] w-[72px]" />
            <div className="shimmer-dark h-16 w-80" />
          </div>
          <div className="shimmer-dark h-5 w-full max-w-3xl" />
          <div className="shimmer-dark h-5 w-2/3" />
          <div className="shimmer-dark mt-8 h-24 w-full" />
        </div>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="bg-ink px-4 pb-32 pt-44 text-center text-white">
        <p className="eyebrow-dark mb-4">404</p>
        <h1 className="text-4xl font-medium">Guide not found</h1>
        <p className="mx-auto mt-4 max-w-md text-white/60">{error || 'This guide does not exist.'}</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className="btn-light">← Back to library</Link>
          <Link href="/generate" className="btn-ghost">Generate it</Link>
        </div>
      </div>
    );
  }

  return <GuideDetail guide={guide} />;
}
