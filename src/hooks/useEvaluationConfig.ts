import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCategories, getSectionWeights, getSectionWeightsForPosition,
  getCompetencies, getCompetenciesForPosition,
  getTemplateQuestions, putTemplateQuestions, patchTemplateQuestion,
  getFullTemplate, getPositionConfig, getScoreLabels,
  getLibraryQuestions, createLibraryQuestion, updateLibraryQuestion, deleteLibraryQuestion,
} from '@/api/evaluation-config';

// ─── Categories ──────────────────────────────────────────────────────────
export function useCategories() {
  return useQuery({ queryKey: ['evalCategories'], queryFn: getCategories });
}

// ─── Section Weights ──────────────────────────────────────────────────────
export function useSectionWeights() {
  return useQuery({ queryKey: ['sectionWeights'], queryFn: getSectionWeights });
}

export function useSectionWeightsForPosition(position: string) {
  return useQuery({ queryKey: ['sectionWeights', position], queryFn: () => getSectionWeightsForPosition(position), enabled: !!position });
}

// ─── Competencies ──────────────────────────────────────────────────────────
export function useCompetencies() {
  return useQuery({ queryKey: ['competencies'], queryFn: getCompetencies });
}

export function useCompetenciesForPosition(positionLevel: string) {
  return useQuery({ queryKey: ['competencies', positionLevel], queryFn: () => getCompetenciesForPosition(positionLevel), enabled: !!positionLevel });
}

// ─── Template Questions ───────────────────────────────────────────────────
export function useTemplateQuestions(filters?: { position?: string; practiceArea?: string; section?: string; category?: string; is_active?: string }) {
  return useQuery({ queryKey: ['templateQuestions', filters], queryFn: () => getTemplateQuestions(filters) });
}

export function usePutTemplateQuestions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ position, questions }: { position: string; questions: any[] }) => putTemplateQuestions(position, questions),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templateQuestions'] }),
  });
}

export function usePatchTemplateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => patchTemplateQuestion(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templateQuestions'] }),
  });
}

// ─── Full Template (assembled with rescaled weights) ──────────────────────
export function useFullTemplate(position: string, practiceArea?: string) {
  return useQuery({
    queryKey: ['fullTemplate', position, practiceArea],
    queryFn: () => getFullTemplate(position, practiceArea),
    enabled: !!position,
  });
}

// ─── Position Config ──────────────────────────────────────────────────────
export function usePositionConfig() {
  return useQuery({ queryKey: ['positionConfig'], queryFn: getPositionConfig });
}

// ─── Score Labels ──────────────────────────────────────────────────────────
export function useScoreLabels() {
  return useQuery({ queryKey: ['scoreLabels'], queryFn: getScoreLabels });
}

// ─── Question Library ─────────────────────────────────────────────────────
export function useLibraryQuestionsConfig() {
  return useQuery({ queryKey: ['libraryQuestionsConfig'], queryFn: getLibraryQuestions });
}

export function useCreateLibraryQuestionConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { category: string; text: string; defaultSection?: string; defaultWeight?: number }) => createLibraryQuestion(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['libraryQuestionsConfig'] }),
  });
}

export function useUpdateLibraryQuestionConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; category?: string; text?: string; defaultSection?: string; defaultWeight?: number }) => updateLibraryQuestion(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['libraryQuestionsConfig'] }),
  });
}

export function useDeleteLibraryQuestionConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLibraryQuestion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['libraryQuestionsConfig'] }),
  });
}
