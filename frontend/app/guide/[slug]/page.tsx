'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchGuide } from '@/lib/api';
import GuideDetail from '@/components/GuideDetail';
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
      .catch(() => setError('Guide not found or backend is not running.'))
      .finally(() => setLoading(false));
  }, [slug]);

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

  return <GuideDetail guide={guide} />;
}
