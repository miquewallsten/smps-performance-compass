import { useEffect, useState } from 'react';

function scoreRingColor(v: number): string {
  if (v >= 90) return 'hsl(var(--smps-success))';
  if (v >= 80) return 'hsl(var(--smps-gold))';
  if (v >= 70) return 'hsl(var(--smps-warning))';
  return 'hsl(var(--destructive))';
}

/**
 * Animated SVG score ring — same concept as the one in UserTimeline
 * but reusable across pages. Animates from 0 to value on mount.
 */
export function ScoreRing({ value, size = 44, label }: { value: number | null; size?: number; label?: string }) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    if (value === null) return;
    const timer = setTimeout(() => setAnimated(value), 50);
    return () => clearTimeout(timer);
  }, [value]);

  if (value === null) {
    return (
      <div className="flex flex-col items-center gap-1">
        <svg width={size} height={size} className="shrink-0">
          <circle cx={size / 2} cy={size / 2} r={(size - 6) / 2} fill="none" stroke="hsl(var(--muted))" strokeWidth={3} />
          <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fill="hsl(var(--muted-foreground))" fontSize={size > 40 ? 12 : 10} fontWeight="700" fontFamily="var(--font-body)">—</text>
        </svg>
        {label && <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>}
      </div>
    );
  }

  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, animated)) / 100;
  const color = scoreRingColor(value);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="shrink-0">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={3} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="tm-ring-anim"
        />
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill="hsl(var(--foreground))"
          fontSize={size > 40 ? 12 : 10}
          fontWeight="700"
          fontFamily="var(--font-display)"
        >
          {animated}
        </text>
      </svg>
      {label && <span className="text-[10px] text-muted-foreground uppercase tracking-wide text-center">{label}</span>}
    </div>
  );
}
