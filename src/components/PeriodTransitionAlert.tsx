import { useAuth } from '@/contexts/AuthContext';
import { useAnalyticsOverview } from '@/api/queries';
import { useCurrentPeriod } from '@/hooks/useCurrentPeriod';
import { usePeriods } from '@/api/queries';
import { Info } from 'lucide-react';
import { useState } from 'react';

/**
 * Shows an alert when the current period has no data yet (period transition).
 * Informs the user that data from the previous period is being shown.
 */
export default function PeriodTransitionAlert() {
  const { user: currentUser } = useAuth();
  const currentPeriod = useCurrentPeriod();
  const { data: overview } = useAnalyticsOverview(currentPeriod);
  const { data: periodsData = [] } = usePeriods();
  const [dismissed, setDismissed] = useState(false);

  if (!currentUser || dismissed) return null;

  // Check if current period has data
  const hasData = overview && (overview.totalEmployees > 0 || overview.selfEvalCompleted > 0);
  if (hasData) return null;

  // Find the previous period
  const sortedPeriods = [...periodsData].sort((a: any, b: any) => b.period.localeCompare(a.period));
  const previousPeriod = sortedPeriods.find((p: any) => p.period < currentPeriod);

  if (!previousPeriod) return null;

  return (
    <div className="mb-4 rounded-xl border border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700 p-3 flex items-start gap-3">
      <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        <p className="font-semibold text-blue-900 dark:text-blue-100">
          Nuevo período: {currentPeriod}
        </p>
        <p className="text-blue-800/80 dark:text-blue-200/80 text-xs mt-0.5">
          El período {currentPeriod} acaba de comenzar. Aún no hay datos disponibles. 
          Los reportes muestran datos del período anterior ({previousPeriod.period}).
        </p>
      </div>
      <button onClick={() => setDismissed(true)} className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40">
        ×
      </button>
    </div>
  );
}
