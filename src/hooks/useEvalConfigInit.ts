/**
 * Initialization hook that loads evaluation config from DB on first use.
 * Populates the evaluationConfig module with DB data so that synchronous
 * getters (getPositionLabel, getSectionWeights, etc.) work correctly.
 *
 * Period resolution is handled by useCurrentPeriod() — do NOT add period
 * logic here, or the two hooks will conflict.
 */
import { useEffect } from 'react';
import { usePositionConfig, useSectionWeights, useScoreLabels, useCategories } from './useEvaluationConfig';
import {
  setPositionConfig, setSectionWeights, setScoreLabels, setCategories,
} from '@/lib/evaluationConfig';

let initialized = false;

export function useEvalConfigInit() {
  const { data: posConfig } = usePositionConfig();
  const { data: swData } = useSectionWeights();
  const { data: slData } = useScoreLabels();
  const { data: catData } = useCategories();

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
    if (posConfig && swData && slData && catData && !initialized) {
      initialized = true;
    }
  }, [posConfig, swData, slData, catData]);
}
