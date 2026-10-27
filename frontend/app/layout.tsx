import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'OAuth Setup Guides | Composio APM',
  description: 'Clear, actionable guides for setting up OAuth apps with any provider. Know the effort, timeline, and blockers before you start.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased">
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold text-slate-900 text-lg">
              <span className="text-blue-600">⚡</span>
              <span>OAuth Guide</span>
              <span className="text-xs font-normal text-slate-400 ml-1 hidden sm:inline">by Composio</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Library</Link>
              <Link
                href="/generate"
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Generate Guide
              </Link>
            </div>
          </div>
        </nav>
        <main>{children}</main>
        <footer className="mt-24 border-t border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 py-8 text-center text-sm text-slate-500">
            <p>OAuth Setup Guides — Built for the Composio APM Integration Assessment</p>
            <p className="mt-1">Guides are research-based. Verify against provider docs before going to production.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
