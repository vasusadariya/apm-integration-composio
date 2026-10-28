// Decorative "signal" bars echoing the composio.dev hero. Deterministic so SSR/CSR match.
const COLORS = ['#2f6bff', '#22c55e', '#06b6d4', '#a855f7', '#3b82f6', '#14b8a6', '#6366f1'];

// Rounded so server and client produce byte-identical style strings
// (Math.sin can differ in the last digits between Node and browsers).
function rand(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return Math.round((x - Math.floor(x)) * 100) / 100;
}

function Cluster({ count, salt, flip }: { count: number; salt: number; flip?: boolean }) {
  return (
    <div
      className={`absolute inset-y-0 ${flip ? 'right-0' : 'left-0'} flex w-[30%] items-center gap-[5px] ${flip ? 'flex-row-reverse' : ''}`}
      style={{
        maskImage: `linear-gradient(to ${flip ? 'left' : 'right'}, #000 5%, transparent 100%)`,
        WebkitMaskImage: `linear-gradient(to ${flip ? 'left' : 'right'}, #000 5%, transparent 100%)`,
      }}
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => {
        const h = Math.round(18 + rand(i, salt) * 62); // %
        const shift = Math.round((rand(i, salt + 3) - 0.5) * 36); // vertical offset %
        const fade = Math.round((1 - i / count) * 100) / 100;
        return (
          <span
            key={i}
            suppressHydrationWarning
            className="block w-[7px] flex-none origin-center animate-bar rounded-[1px] sm:w-[9px]"
            style={{
              height: `${h}%`,
              transform: `translateY(${shift}%)`,
              background: COLORS[Math.floor(rand(i, salt + 7) * COLORS.length)],
              opacity: (0.25 + fade * 0.6).toFixed(2),
              animationDelay: `${(rand(i, salt + 11) * 3).toFixed(2)}s`,
              animationDuration: `${(2.4 + rand(i, salt + 5) * 2.4).toFixed(2)}s`,
            }}
          />
        );
      })}
    </div>
  );
}

export default function GlitchBars({ intensity = 'full' }: { intensity?: 'full' | 'soft' }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${intensity === "soft" ? "opacity-40" : "opacity-50 sm:opacity-100"}`} aria-hidden>
      <Cluster count={22} salt={1} />
      <Cluster count={16} salt={9} flip />
      <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_45%,rgba(10,10,10,0.55),transparent_75%)]" />
    </div>
  );
}
