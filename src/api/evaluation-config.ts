import { api } from './client';

// ─── Categories ──────────────────────────────────────────────────────────
export function getCategories() {
  return api.get<any[]>('/api/evaluation-config/categories');
}

// ─── Section Weights ──────────────────────────────────────────────────────
export function getSectionWeights() {
  return api.get<any[]>('/api/evaluation-config/section-weights');
}

export function getSectionWeightsForPosition(position: string) {
  return api.get<any>(`/api/evaluation-config/section-weights/${position}`);
}

// ─── Competencies ──────────────────────────────────────────────────────────
export function getCompetencies() {
  return api.get<any[]>('/api/evaluation-config/competencies');
}

export function getCompetenciesForPosition(positionLevel: string) {
  return api.get<any[]>(`/api/evaluation-config/competencies/${positionLevel}`);
}

// ─── Template Questions ───────────────────────────────────────────────────
export function getTemplateQuestions(filters?: { position?: string; practiceArea?: string; section?: string; category?: string; is_active?: string }) {
  const params = filters ? '?' + new URLSearchParams(filters as Record<string, string>).toString() : '';
  return api.get<any[]>(`/api/evaluation-config/template-questions${params}`);
}

export function putTemplateQuestions(position: string, questions: any[]) {
  return api.put<any[]>(`/api/evaluation-config/template-questions/${position}`, { questions });
}

export function patchTemplateQuestion(id: string, data: any) {
  return api.patch<any>(`/api/evaluation-config/template-questions/${id}`, data);
}

// ─── Full Template (assembled with rescaled weights) ──────────────────────
export function getFullTemplate(position: string, practiceArea?: string) {
  const params = practiceArea ? `?practiceArea=${practiceArea}` : '';
  return api.get<any>(`/api/evaluation-config/full-template/${position}${params}`);
}

// ─── Position Config ──────────────────────────────────────────────────────
export function getPositionConfig() {
  return api.get<any[]>('/api/evaluation-config/positions');
}

// ─── Score Labels ──────────────────────────────────────────────────────────
export function getScoreLabels() {
  return api.get<any[]>('/api/evaluation-config/score-labels');
}

// ─── Question Library ─────────────────────────────────────────────────────
export function getLibraryQuestions() {
  return api.get<any[]>('/api/evaluation-config/library');
}

export function createLibraryQuestion(data: { category: string; text: string; defaultSection?: string; defaultWeight?: number }) {
  return api.post<any>('/api/evaluation-config/library', data);
}

export function updateLibraryQuestion(id: string, data: { category?: string; text?: string; defaultSection?: string; defaultWeight?: number }) {
  return api.patch<any>(`/api/evaluation-config/library/${id}`, data);
}

export function deleteLibraryQuestion(id: string) {
  return api.delete(`/api/evaluation-config/library/${id}`);
}
