export default function Logo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden>
      <rect x="3" y="3" width="11" height="11" fill="currentColor" />
      <rect x="18" y="3" width="11" height="11" fill="currentColor" opacity="0.55" />
      <rect x="3" y="18" width="11" height="11" fill="currentColor" opacity="0.55" />
      <rect x="18" y="18" width="11" height="11" fill="currentColor" />
    </svg>
  );
}
