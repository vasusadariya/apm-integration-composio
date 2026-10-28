'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';

const LINKS = [
  { href: '/', label: 'Library' },
  { href: '/generate', label: 'Generate' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname?.startsWith(href));

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled || open ? 'border-b border-white/10 bg-ink/85 backdrop-blur-xl' : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2.5 text-white">
          <Logo className="h-6 w-6 transition-transform duration-500 group-hover:rotate-90" />
          <span className="text-[19px] font-semibold tracking-tight">OAuth Guides</span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-white/40 sm:inline">/ for Composio</span>
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`relative font-mono text-[13px] uppercase tracking-[0.08em] transition-colors ${
                isActive(l.href) ? 'text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              {l.label}
              <span
                className={`absolute -bottom-1.5 left-0 h-px bg-white transition-all duration-300 ${
                  isActive(l.href) ? 'w-full' : 'w-0'
                }`}
              />
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <Link href="/generate" className="btn-light btn-sm">
            Generate a guide <span className="arr">→</span>
          </Link>
        </div>

        <button
          className="flex h-10 w-10 flex-col items-center justify-center gap-[5px] md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <span className={`h-px w-5 bg-white transition-transform ${open ? 'translate-y-[6px] rotate-45' : ''}`} />
          <span className={`h-px w-5 bg-white transition-opacity ${open ? 'opacity-0' : ''}`} />
          <span className={`h-px w-5 bg-white transition-transform ${open ? '-translate-y-[6px] -rotate-45' : ''}`} />
        </button>
      </div>

      <div className={`fold md:hidden ${open ? 'open' : ''}`}>
        <div>
          <div className="space-y-1 px-4 pb-5">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="block border-b border-white/10 py-3 font-mono text-sm uppercase tracking-[0.08em] text-white/80">
                {l.label}
              </Link>
            ))}
            <Link href="/generate" className="btn-light mt-3 w-full">Generate a guide →</Link>
          </div>
        </div>
      </div>
    </header>
  );
}
