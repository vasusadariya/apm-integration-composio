export const DIFFICULTY: Record<string, { label: string; dot: string; level: number; text: string }> = {
  easy:      { label: 'Easy',      dot: 'bg-emerald-500', level: 1, text: 'text-emerald-700' },
  medium:    { label: 'Medium',    dot: 'bg-amber-400',   level: 2, text: 'text-amber-700' },
  hard:      { label: 'Hard',      dot: 'bg-orange-500',  level: 3, text: 'text-orange-700' },
  very_hard: { label: 'Very Hard', dot: 'bg-red-500',     level: 4, text: 'text-red-700' },
};

export default function DifficultyBadge({ difficulty, dark = false }: { difficulty: string; dark?: boolean }) {
  const c = DIFFICULTY[difficulty] ?? { label: difficulty, dot: 'bg-zinc-400', level: 0, text: 'text-zinc-600' };
  return (
    <span
      className={`inline-flex items-center gap-2 border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.08em] ${
        dark ? 'border-white/20 text-white/90' : 'border-zinc-200 bg-white text-zinc-700'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

/** 4-segment meter showing how hard the setup is. */
export function DifficultyMeter({ difficulty, dark = false }: { difficulty: string; dark?: boolean }) {
  const c = DIFFICULTY[difficulty];
  const level = c?.level ?? 0;
  return (
    <div className="flex items-center gap-1" aria-label={`Difficulty ${level} of 4`}>
      {[1, 2, 3, 4].map((n) => (
        <span
          key={n}
          className={`h-1.5 w-6 transition-all duration-500 ${
            n <= level ? c.dot : dark ? 'bg-white/15' : 'bg-zinc-200'
          }`}
        />
      ))}
    </div>
  );
}
