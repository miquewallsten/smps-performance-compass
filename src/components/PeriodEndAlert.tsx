import { useApp } from '@/contexts/AppContext';
import { CURRENT_PERIOD } from '@/types';
import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

/**
 * Shows an alert when the current period's actionPlanEnd (or feedbackEnd if missing)
 * is less than ~2 months away.
 */
export default function PeriodEndAlert() {
  const { periodConfigs, currentUser } = useApp();
  const [dismissed, setDismissed] = useState(false);

  if (!currentUser || dismissed) return null;
  const cfg = periodConfigs.find(c => c.period === CURRENT_PERIOD);
  if (!cfg) return null;

  const endStr = cfg.actionPlanEnd || cfg.feedbackEnd || cfg.supervisorEnd;
  if (!endStr) return null;

  const end = new Date(endStr);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // Show if 0 < diffDays <= 60 (≈ 2 months before end)
  if (diffDays <= 0 || diffDays > 60) return null;

  return (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-3 flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        <p className="font-semibold text-amber-900 dark:text-amber-100">
          El periodo {CURRENT_PERIOD} cierra en {diffDays} día{diffDays === 1 ? '' : 's'}
        </p>
        <p className="text-amber-800/80 dark:text-amber-200/80 text-xs mt-0.5">
          Fecha límite: {end.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}.
          Asegúrate de completar tu evaluación, feedback y plan de acción antes del cierre.
        </p>
      </div>
      <button onClick={() => setDismissed(true)} className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/40">
        <X className="h-4 w-4 text-amber-700 dark:text-amber-300" />
      </button>
    </div>
  );
}
