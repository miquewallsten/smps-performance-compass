import { useMemo } from 'react';
import { usePeriods, useAnalyticsOverview } from '@/api/queries';

/**
 * Resolves the best period to DISPLAY analytics and history.
 *
 * Unlike useCurrentPeriod (which resolves by calendar date for creation workflows),
 * this hook resolves to the most recent period with meaningful evaluation data.
 *
 * Rules (in priority order):
 * 1. If the most recent period has real evaluation data, use it
 * 2. Otherwise, fall back to the next most recent period
 * 3. If no periods at all, default to '2026-H1'
 *
 * Uses the lightweight analytics overview API (aggregate counts, not full evaluations).
 */
export function useDisplayPeriod(): string {
  const { data: periodsData = [] } = usePeriods();

  const sortedPeriods = useMemo(() => {
    if (periodsData.length === 0) return [];
    return [...periodsData].sort(
      (a: any, b: any) => new Date(b.selfStart || b.self_start).getTime() - new Date(a.selfStart || a.self_start).getTime()
    );
  }, [periodsData]);

  const newestPeriod = sortedPeriods[0]?.period;
  const { data: newestOverview } = useAnalyticsOverview(newestPeriod || '2026-H1');

  const displayPeriod = useMemo(() => {
    if (periodsData.length === 0) return '2026-H1';

    // If newest period has real evaluation data, use it
    if (newestOverview) {
      const hasData = (newestOverview.selfEvalCompleted || 0) > 0 || (newestOverview.supervisorEvalCompleted || 0) > 0;
      if (hasData) return newestPeriod!;
    }

    // Otherwise, fall back to the previous period
    const fallback = sortedPeriods[1]?.period || sortedPeriods[0]?.period || '2026-H1';
    return fallback;
  }, [periodsData, sortedPeriods, newestPeriod, newestOverview]);

  return displayPeriod;
}
