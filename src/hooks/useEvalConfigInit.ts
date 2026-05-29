/**
 * Initialization hook that loads evaluation config from DB on first use.
 * Populates the evaluationConfig module with DB data so that synchronous
 * getters (getPositionLabel, getSectionWeights, etc.) work correctly.
 */
import { useEffect } from 'react';
import { usePositionConfig, useSectionWeights, useScoreLabels, useCategories } from './useEvaluationConfig';
import { usePeriods } from '@/api/queries';
import {
  setPositionConfig, setSectionWeights, setScoreLabels, setCategories, setPeriods, setCurrentPeriod,
} from '@/lib/evaluationConfig';

let initialized = false;

export function useEvalConfigInit() {
  const { data: posConfig } = usePositionConfig();
  const { data: swData } = useSectionWeights();
  const { data: slData } = useScoreLabels();
  const { data: catData } = useCategories();
  const { data: periodsData } = usePeriods();

  useEffect(() => {
    if (posConfig && posConfig.length > 0) {
      setPositionConfig(posConfig);
    }
  }, [posConfig]);

  useEffect(() => {
    if (swData && swData.length > 0) {
      setSectionWeights(swData);
    }
  }, [swData]);

  useEffect(() => {
    if (slData && slData.length > 0) {
      setScoreLabels(slData);
    }
  }, [slData]);

  useEffect(() => {
    if (catData && catData.length > 0) {
      setCategories(catData);
    }
  }, [catData]);

  useEffect(() => {
    if (periodsData && periodsData.length > 0) {
      const periodStrings = periodsData.map((p: any) => p.period).sort();
      setPeriods(periodStrings);
      // Determine current period: most recent period, or the one whose self-eval dates include now
      const now = new Date();
      const current = periodsData.find((p: any) => {
        const start = new Date(p.self_start);
        const end = new Date(p.self_end);
        return now >= start && now <= end;
      });
      setCurrentPeriod(current ? current.period : periodStrings[periodStrings.length - 1]);
    }
  }, [periodsData]);

  useEffect(() => {
    if (posConfig && swData && slData && catData && !initialized) {
      initialized = true;
    }
  }, [posConfig, swData, slData, catData]);
}
