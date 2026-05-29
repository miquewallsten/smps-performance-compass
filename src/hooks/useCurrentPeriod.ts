import { useMemo } from 'react';
import { usePeriods } from '@/api/queries';
import { setPeriods, setCurrentPeriod } from '@/lib/evaluationConfig';

/**
 * Reactive hook that resolves the current evaluation period from the DB.
 *
 * Replaces the mutable `CURRENT_PERIOD` module variable for React components.
 * Tied to usePeriods() — when periods data arrives or changes, the returned
 * period updates and triggers a re-render.
 *
 * Also keeps the module-level CURRENT_PERIOD in sync for any non-React code
 * that still reads it directly.
 */
export function useCurrentPeriod(): string {
  const { data: periodsData = [] } = usePeriods();

  return useMemo(() => {
    if (periodsData.length === 0) {
      return '2026-H1';
    }

    const now = new Date();

    // 1. Find a period where we're within its overall range (self_start → action_plan_end)
    const current = periodsData.find((p: any) => {
      const overallStart = new Date(p.self_start);
      const overallEnd = new Date(p.action_plan_end || p.feedback_end || p.supervisor_end || p.self_end);
      return now >= overallStart && now <= overallEnd;
    });

    if (current) {
      setPeriods(periodsData.map((p: any) => p.period).sort());
      setCurrentPeriod(current.period);
      return current.period;
    }

    // 2. Fallback: most recent period that has already started
    const sorted = [...periodsData].sort(
      (a: any, b: any) => new Date(a.self_start).getTime() - new Date(b.self_start).getTime()
    );
    const started = sorted.filter((p: any) => new Date(p.self_start) <= now);
    const resolved = started.length > 0
      ? started[started.length - 1].period
      : sorted[sorted.length - 1].period;

    setPeriods(periodsData.map((p: any) => p.period).sort());
    setCurrentPeriod(resolved);
    return resolved;
  }, [periodsData]);
}
