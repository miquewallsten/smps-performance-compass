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
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-300 ${phase === 'fading' ? 'opacity-0' : 'opacity-100'}`}>
      <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
        <div className="relative">
          <svg width="96" height="96" viewBox="0 0 96 96" fill="none" className="drop-shadow-lg">
            <circle cx="48" cy="48" r="42" fill="hsl(var(--smps-success)/15)" stroke="hsl(var(--smps-success))" strokeWidth="3"
              strokeDasharray="264" strokeDashoffset={phase === 'drawing' ? '264' : '0'}
              className="transition-[stroke-dashoffset] duration-500 ease-out"
            />
            <path d="M28 48 L42 62 L68 36" stroke="hsl(var(--smps-success))" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="56" strokeDashoffset={phase === 'drawing' ? '56' : '0'}
              className="transition-[stroke-dashoffset] duration-400 ease-out"
              style={{ transitionDelay: '150ms' }}
            />
          </svg>
        </div>
        <p className="font-display text-xl font-semibold text-foreground drop-shadow-sm">Evaluación enviada</p>
      </div>
    </div>
  );
}
