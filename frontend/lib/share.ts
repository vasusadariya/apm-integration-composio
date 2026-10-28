import type { OAuthGuide } from './types';

// Generated guides live on a server with an ephemeral disk, so share links also carry the
// guide itself (gzip + base64url in the URL fragment). If the server no longer has the
// guide, the page rebuilds it from the link — the link keeps working.

const toB64 = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...Array.from(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64 = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

export async function encodeGuide(guide: OAuthGuide): Promise<string | null> {
  try {
    if (typeof CompressionStream === 'undefined') return null;
    const gz = await pipe(new TextEncoder().encode(JSON.stringify(guide)), new CompressionStream('gzip'));
    return toB64(gz);
  } catch {
    return null;
  }
}

export async function decodeGuide(hash: string): Promise<OAuthGuide | null> {
  try {
    const m = hash.match(/g=([A-Za-z0-9_-]+)/);
    if (!m || typeof DecompressionStream === 'undefined') return null;
    const raw = await pipe(fromB64(m[1]), new DecompressionStream('gzip'));
    const g = JSON.parse(new TextDecoder().decode(raw));
    return g && g.app && Array.isArray(g.steps) ? (g as OAuthGuide) : null;
  } catch {
    return null;
  }
}

export function guideToMarkdown(g: OAuthGuide): string {
  const L: string[] = [];
  L.push(`# ${g.app} — OAuth setup guide`, '', g.summary, '');
  L.push(`- **Difficulty:** ${g.difficulty.replace('_', ' ')}`, `- **Setup time:** ${g.setup_time_estimate}`, `- **Approval wait:** ${g.approval_time_estimate}`, `- **Review required:** ${g.requires_approval ? 'yes' : 'no'}`, `- **Confidence:** ${g.confidence.replace('_', ' ')}`, '');
  if (g.next_step) L.push('## Your next step', g.next_step, '');
  if (g.key_facts?.length) L.push('## Key facts', ...g.key_facts.map((f) => `- ${f}`), '');
  L.push('## Steps');
  g.steps.forEach((s) => {
    L.push(`${s.number}. **${s.title}** (${s.estimated_time}, ${s.agent_can_do ? 'agent can do' : 'you do'}) — ${s.description}${s.url ? ` [link](${s.url})` : ''}`);
    (s.warnings ?? []).forEach((w) => L.push(`   - ⚠️ ${w}`));
  });
  L.push('', '## Blockers');
  g.blockers.forEach((b) => L.push(`- **${b.title}** (${b.severity}): ${b.description}${b.workaround ? ` _Workaround: ${b.workaround}_` : ''}`));
  if (g.if_blocked?.length) { L.push('', '## If you get stuck'); g.if_blocked.forEach((b) => L.push(`- **${b.situation}** → ${b.action}${b.url ? ` ${b.url}` : ''}`)); }
  if (g.verification) {
    const v = g.verification;
    L.push('', `## Verification (${v.status.replace('_', ' ')}, ${v.checked_on ?? 'n/a'})`);
    v.confirmed.forEach((c) => L.push(`- ✅ ${c}`));
    v.corrected.forEach((c) => L.push(`- 🛠 ${c}`));
    v.unverified.forEach((c) => L.push(`- ❓ ${c}`));
  }
  L.push('', '## Sources', ...g.sources.map((s) => `- [${s.title}](${s.url}) (${s.type.replace('_', ' ')})`));
  return L.join('\n');
}

export function download(filename: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
