import Link from 'next/link';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <Logo className="h-6 w-6 text-ink" />
            <span className="text-lg font-semibold tracking-tight">OAuth Guides</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-500">
            Know the effort, the wait and the blockers of every provider&apos;s OAuth setup before you start building.
          </p>
        </div>
        <div>
          <p className="eyebrow mb-4">Explore</p>
          <ul className="space-y-2.5 font-mono text-[13px] uppercase tracking-[0.06em]">
            <li><Link href="/" className="text-zinc-700 transition-colors hover:text-brand">Guide library</Link></li>
            <li><Link href="/generate" className="text-zinc-700 transition-colors hover:text-brand">Generate a guide</Link></li>
            <li><a href="https://docs.composio.dev" target="_blank" rel="noopener noreferrer" className="text-zinc-700 transition-colors hover:text-brand">Composio docs ↗</a></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4">Heads up</p>
          <p className="text-sm leading-relaxed text-zinc-500">
            Guides are research-based. Always verify against the provider&apos;s docs before going to production.
          </p>
        </div>
      </div>
      <div className="border-t border-zinc-200">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-5 font-mono text-[11px] uppercase tracking-[0.1em] text-zinc-400 sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} OAuth Guides</span>
          <span>Built for the Composio APM Integrations assessment</span>
        </div>
      </div>
    </footer>
  );
}
