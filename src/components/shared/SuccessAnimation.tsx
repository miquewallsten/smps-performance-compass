import { useEffect, useState } from 'react';

/**
 * Brief success overlay: a check SVG that draws in, holds, then fades out.
 * Shows for ~800ms total (300ms draw + 500ms hold).
 */
export function SuccessAnimation({ onComplete }: { onComplete?: () => void }) {
  const [phase, setPhase] = useState<'drawing' | 'holding' | 'fading'>('drawing');

  useEffect(() => {
    const holdTimer = setTimeout(() => setPhase('holding'), 350);
    const fadeTimer = setTimeout(() => setPhase('fading'), 700);
    const doneTimer = setTimeout(() => onComplete?.(), 1000);
    return () => { clearTimeout(holdTimer); clearTimeout(fadeTimer); clearTimeout(doneTimer); };
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-200 ${phase === 'fading' ? 'opacity-0' : 'opacity-100'}`}>
      <div className="flex flex-col items-center gap-3">
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
          <circle cx="36" cy="36" r="32" fill="hsl(var(--smps-success)/10)" stroke="hsl(var(--smps-success))" strokeWidth="2.5"
            strokeDasharray="201" strokeDashoffset={phase === 'drawing' ? '201' : '0'}
            className="transition-[stroke-dashoffset] duration-500 ease-out"
          />
          <path d="M22 36 L32 46 L50 26" stroke="hsl(var(--smps-success))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="42" strokeDashoffset={phase === 'drawing' ? '42' : '0'}
            className="transition-[stroke-dashoffset] duration-400 ease-out"
            style={{ transitionDelay: '150ms' }}
          />
        </svg>
        <p className="font-display text-lg font-semibold text-foreground">Evaluación enviada</p>
      </div>
    </div>
  );
}
