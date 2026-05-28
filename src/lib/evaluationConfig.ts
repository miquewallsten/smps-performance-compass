/**
 * Evaluation Config — Compatibility Layer
 * 
 * This module replaces ALL hardcoded data from @/data/* and @/types
 * with DB-driven data fetched from the evaluation-config API.
 * 
 * It provides synchronous fallbacks (for initial load before API data arrives)
 * and async functions for fetching fresh data.
 * 
 * Key principle: questions in the library have NO weight. Weights only exist
 * in template_questions (per position). The CSV does not include percentages.
 */

import { Position, PositionLevel, EvalSection, QuestionCategory, PracticeArea } from '@/types';

// ─── SECTION CONFIG (static — these are UI labels, not DB data) ───────────
export const SECTION_LABELS: Record<EvalSection, string> = {
  competencias: 'Competencias',
  tecnico: 'Criterio Técnico',
  blandas: 'Habilidades Blandas',
};

export const SECTION_ORDER: EvalSection[] = ['competencias', 'tecnico', 'blandas'];

export const ALL_CATEGORIES: QuestionCategory[] = [
  'Desempeño', 'Liderazgo', 'Cumplimiento', 'Habilidades Blandas',
  'Trabajo en Equipo', 'Actitud', 'Disponibilidad', 'Desarrollo', 'Comunicación',
  'Criterio Técnico',
  'Conocimiento normativo', 'Redacción legal', 'Due diligence',
  'Constitución y modificaciones', 'Atención a clientes',
  'Normatividad fiscal', 'Opiniones fiscales', 'Planeación fiscal',
  'Criterios y jurisprudencia', 'Impactos fiscales',
  'Redacción de escritos', 'Estrategia procesal', 'Audiencias y diligencias',
  'Seguimiento de expedientes',
];

/**
 * Determine section from category (for Question Library grouping).
 */
export function getSectionByCategory(category: QuestionCategory): EvalSection {
  if (category === 'Habilidades Blandas' || category === 'Actitud' || category === 'Disponibilidad' || category === 'Desarrollo' || category === 'Comunicación') {
    return 'blandas';
  }
  if (category === 'Criterio Técnico') return 'tecnico';
  const TECH_SUBS = new Set([
    'Conocimiento normativo', 'Redacción legal', 'Due diligence',
    'Constitución y modificaciones', 'Atención a clientes',
    'Normatividad fiscal', 'Opiniones fiscales', 'Planeación fiscal',
    'Criterios y jurisprudencia', 'Impactos fiscales',
    'Redacción de escritos', 'Estrategia procesal', 'Audiencias y diligencias',
    'Seguimiento de expedientes',
  ]);
  if (TECH_SUBS.has(category)) return 'tecnico';
  return 'competencias';
}

/**
 * Determine section for a question given its category and position level.
 */
export function getSectionForQuestion(category: QuestionCategory, position: Position): EvalSection {
  const isSoft = category === 'Habilidades Blandas' || category === 'Actitud' || category === 'Disponibilidad' || category === 'Desarrollo' || category === 'Comunicación';
  if (isSoft) return 'blandas';

  const level = getPositionLevel(position);
  if (level === 'legal') {
    if (category === 'Criterio Técnico') return 'tecnico';
    const TECH_SUBS = new Set([
      'Conocimiento normativo', 'Redacción legal', 'Due diligence',
      'Constitución y modificaciones', 'Atención a clientes',
      'Normatividad fiscal', 'Opiniones fiscales', 'Planeación fiscal',
      'Criterios y jurisprudencia', 'Impactos fiscales',
      'Redacción de escritos', 'Estrategia procesal', 'Audiencias y diligencias',
      'Seguimiento de expedientes',
    ]);
    if (TECH_SUBS.has(category)) return 'tecnico';
    return 'competencias';
  }
  return 'competencias';
}

// ─── POSITION CONFIG (DB-driven, with fallbacks) ──────────────────────────

let _positionConfig: any[] = [];

export function setPositionConfig(config: any[]) {
  _positionConfig = config;
}

export function getPositionConfig() {
  return _positionConfig;
}

export function getPositionLabel(pos: Position): string {
  const entry = _positionConfig.find(p => p.position === pos);
  if (entry) return entry.label;
  // Fallback labels
  const FALLBACKS: Record<string, string> = {
    socio: 'Socio', salary_partner: 'Salary Partner', counsel: 'Counsel',
    asociado_sr: 'Asociado Sr', asociado_mid: 'Asociado Mid', asociado_jr: 'Asociado Jr',
    pasante_carrera: 'Pasante con Carrera', pasante_corporativo: 'Pasante', pasante: 'Pasante',
    director: 'Director', gerente: 'Gerente', coordinador: 'Coordinador',
    analista: 'Analista', asistente: 'Asistente', archivo_soporte: 'Archivo y Soporte',
    soporte: 'Soporte', archivista: 'Archivista', dummy: 'Dummy',
  };
  return FALLBACKS[pos] || pos;
}

export function getPositionLevel(pos: Position | string): PositionLevel {
  const entry = _positionConfig.find(p => p.position === pos);
  if (entry) return entry.level as PositionLevel;
  const LEGAL = new Set(['socio', 'salary_partner', 'counsel', 'asociado_sr', 'asociado_mid', 'asociado_jr', 'pasante_carrera', 'pasante_corporativo', 'pasante']);
  return LEGAL.has(pos as string) ? 'legal' : 'administrativo';
}

export function getPositionRank(pos: Position | string): number {
  const entry = _positionConfig.find(p => p.position === pos);
  if (entry) return entry.rank;
  const FALLBACKS: Record<string, number> = {
    socio: 0, salary_partner: 1, counsel: 1, director: 1,
    asociado_sr: 2, gerente: 2, asociado_mid: 3, coordinador: 3,
    asociado_jr: 4, analista: 4, pasante_carrera: 5, asistente: 5,
    pasante_corporativo: 6, pasante: 6, soporte: 6, archivista: 6,
    archivo_soporte: 6, dummy: 99,
  };
  return FALLBACKS[pos as string] ?? 99;
}

export function getLegalHierarchy(): Position[] {
  if (_positionConfig.length > 0) {
    return _positionConfig
      .filter(p => p.level === 'legal' && p.position !== 'dummy')
      .sort((a, b) => a.rank - b.rank)
      .map(p => p.position as Position);
  }
  return ['socio', 'salary_partner', 'counsel', 'asociado_sr', 'asociado_mid', 'asociado_jr', 'pasante_carrera', 'pasante_corporativo', 'pasante'];
}

export function getAdminHierarchy(): Position[] {
  if (_positionConfig.length > 0) {
    return _positionConfig
      .filter(p => p.level === 'administrativo' && p.position !== 'dummy')
      .sort((a, b) => a.rank - b.rank)
      .map(p => p.position as Position);
  }
  return ['director', 'gerente', 'coordinador', 'analista', 'asistente', 'archivo_soporte', 'soporte', 'archivista'];
}

export function getPositionHierarchy(): Position[] {
  return [...getLegalHierarchy(), ...getAdminHierarchy()];
}

// ─── SECTION WEIGHTS (DB-driven) ─────────────────────────────────────────

let _sectionWeights: Record<string, { tecnico: number; competencias: number; blandas: number }> = {};

export function setSectionWeights(weights: any[]) {
  _sectionWeights = {};
  for (const w of weights) {
    _sectionWeights[w.position] = { tecnico: w.tecnico, competencias: w.competencias, blandas: w.blandas };
  }
}

export function getSectionWeights(position: Position | string): { tecnico: number; competencias: number; blandas: number } {
  return _sectionWeights[position] || { tecnico: 0, competencias: 80, blandas: 20 };
}

// ─── SCORE LABELS (DB-driven) ─────────────────────────────────────────────

let _scoreLabels: Record<number, string> = { 1: 'Deficiente', 2: 'Necesita Mejorar', 3: 'Satisfactorio', 4: 'Bueno', 5: 'Excelente' };

export function setScoreLabels(labels: any[]) {
  _scoreLabels = {};
  for (const l of labels) {
    _scoreLabels[l.score] = l.label;
  }
}

export function getScoreLabels(): Record<number, string> {
  return _scoreLabels;
}

// ─── CATEGORIES (DB-driven) ───────────────────────────────────────────────

let _categories: any[] = [];

export function setCategories(categories: any[]) {
  _categories = categories;
}

export function getCategories(): any[] {
  return _categories;
}

// ─── NORMALIZATION (same logic as before) ──────────────────────────────────

export function normalizePosition(pos: Position | string): Position {
  if (pos === 'pasante_corporativo') return 'pasante' as Position;
  if (pos === 'archivo_soporte') return 'soporte' as Position;
  return pos as Position;
}

export function normalizePracticeArea(area: PracticeArea | string): 'fiscal_consultoria' | 'fiscal_litigio' | 'corporativo' | 'backoffice' {
  if (area === 'consultoria_fiscal') return 'fiscal_consultoria';
  if (area === 'litigio_fiscal') return 'fiscal_litigio';
  if (area === 'general') return 'corporativo';
  return area as any;
}

// ─── SCORE CALCULATION (pure function, stays client-side) ─────────────────

export interface ScoreQuestion { id: string; weight: number; }
export interface ScoreResponse { questionId: string; score: number; notApplicable?: boolean; noElements?: boolean; }

export function calculateScore(
  questions: ScoreQuestion[],
  responses: ScoreResponse[],
  naApprovals?: Record<string, boolean>
): number {
  const activeQuestions = questions.filter(q => {
    const r = responses.find(r => r.questionId === q.id);
    if (r?.notApplicable && naApprovals?.[q.id]) return false;
    if (r?.noElements) return false;
    if (r?.notApplicable && !naApprovals && r.score === 0) return false;
    return true;
  });

  const totalWeight = activeQuestions.reduce((sum, q) => sum + q.weight, 0);
  if (totalWeight === 0) return 0;

  let weightedSum = 0;
  for (const q of activeQuestions) {
    const r = responses.find(r => r.questionId === q.id);
    if (r && !r.notApplicable && !r.noElements && r.score > 0) {
      weightedSum += (r.score / 5) * q.weight;
    }
  }
  return Math.round((weightedSum / totalWeight) * 100);
}

// ─── LEVEL LABELS (derived from work_areas, but simple fallback) ────────────

export const LEVEL_LABELS: Record<PositionLevel, string> = {
  legal: 'Legal',
  administrativo: 'Administrativo',
};

// ─── PERIODS (will come from DB, but fallback) ────────────────────────────

export const PERIODS = ['2025-H2', '2026-H1', '2026-H2'];
export const CURRENT_PERIOD = '2026-H1';
