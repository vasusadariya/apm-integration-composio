'use client';

import { useState } from 'react';

export default function AppLogo({ src, name, size = 44 }: { src?: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(!src);
  return (
    <div
      className="flex flex-none items-center justify-center overflow-hidden border border-zinc-200 bg-white"
      style={{ width: size, height: size }}
    >
      {failed ? (
        <span className="font-mono text-sm font-bold text-ink">{name.slice(0, 1).toUpperCase()}</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className="object-contain"
          style={{ width: size * 0.64, height: size * 0.64 }}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
