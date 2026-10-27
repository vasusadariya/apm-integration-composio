// API client for the OAuth Guide backend

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchAllGuides() {
  const res = await fetch(`${API_BASE}/api/guides`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch guides');
  return res.json();
}

export async function fetchGuide(slug: string) {
  const res = await fetch(`${API_BASE}/api/guides/${slug}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Guide '${slug}' not found`);
  return res.json();
}

export async function searchGuides(query: string) {
  const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export const API_URL = API_BASE;
