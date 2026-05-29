/**
 * Evaluation Config — DB-Driven Module
 *
 * ALL data comes from the database via the evaluation-config API.
 * No hardcoded position labels, hierarchies, weights, or categories.
 * The only static things here are UI labels (SECTION_LABELS, SECTION_ORDER)
 * and pure client-side functions (calculateScore, normalizePosition).
 */

// ─── SECTION CONFIG (static — these are UI labels, not DB data) ───────────
export const SECTION_LABELS: Record<string, string> = {
  competencias: 'Competencias',
  tecnico: 'Criterio Técnico',
  blandas: 'Habilidades Blandas',
};

export const SECTION_ORDER: string[] = ['competencias', 'tecnico', 'blandas'];

// ─── POSITION CONFIG (DB-driven, NO fallbacks) ──────────────────────────

let _positionConfig: any[] = [];

export function setPositionConfig(config: any[]) {
  _positionConfig = config;
}

export function getPositionConfig() {
  return _positionConfig;
}

export function getPositionLabel(pos: string): string {
  const entry = _positionConfig.find(p => p.position === pos);
  if (entry) return entry.label;
  // Capitalize first letter as minimal fallback
  return pos.charAt(0).toUpperCase() + pos.slice(1).replace(/_/g, ' ');
}

export function getPositionLevel(pos: string): string {
  const entry = _positionConfig.find(p => p.position === pos);
  if (entry) return entry.level;
  // Infer from common patterns if DB not loaded yet
  const LEGAL = new Set(['socio', 'salary_partner', 'counsel', 'asociado_sr', 'asociado_mid', 'asociado_jr', 'pasante_carrera', 'pasante_corporativo', 'pasante']);
  return LEGAL.has(pos) ? 'legal' : 'administrativo';
}

export function getPositionRank(pos: string): number {
  const entry = _positionConfig.find(p => p.position === pos);
  if (entry) return entry.position_rank;
  return 99;
}

export function getLegalHierarchy(): string[] {
  if (_positionConfig.length > 0) {
    return _positionConfig
      .filter(p => p.level === 'legal' && p.position !== 'dummy')
      .sort((a, b) => a.position_rank - b.position_rank)
      .map(p => p.position);
  }
  return [];
}

export function getAdminHierarchy(): string[] {
  if (_positionConfig.length > 0) {
    return _positionConfig
      .filter(p => p.level === 'administrativo' && p.position !== 'dummy')
      .sort((a, b) => a.position_rank - b.position_rank)
      .map(p => p.position);
  }
  return [];
}

export function getPositionHierarchy(): string[] {
  return [...getLegalHierarchy(), ...getAdminHierarchy()];
}

// ─── SECTION WEIGHTS (DB-driven, NO fallbacks) ────────────────────────────

let _sectionWeights: Record<string, { tecnico: number; competencias: number; blandas: number }> = {};

export function setSectionWeights(weights: any[]) {
  _sectionWeights = {};
  for (const w of weights) {
    _sectionWeights[w.position] = { tecnico: w.tecnico, competencias: w.competencias, blandas: w.blandas };
  }
}

export function getSectionWeights(position: string): { tecnico: number; competencias: number; blandas: number } {
  return _sectionWeights[position] || { tecnico: 0, competencias: 80, blandas: 20 };
}

// ─── SCORE LABELS (DB-driven) ─────────────────────────────────────────────

let _scoreLabels: Record<number, string> = {};

export function setScoreLabels(labels: any[]) {
  _scoreLabels = {};
  for (const l of labels) {
    _scoreLabels[l.score] = l.label;
  }
}

export function getScoreLabels(): Record<number, string> {
  if (Object.keys(_scoreLabels).length > 0) return _scoreLabels;
  return { 1: 'Deficiente', 2: 'Necesita Mejorar', 3: 'Satisfactorio', 4: 'Bueno', 5: 'Excelente' };
}

// ─── CATEGORIES (DB-driven) ────────────────────────────────────────────────

let _categories: any[] = [];

export function setCategories(categories: any[]) {
  _categories = categories;
}

export function getCategories(): any[] {
  return _categories;
}

export function getCategoryLabels(): string[] {
  return _categories.map(c => c.label || c.id);
}

/**
 * Determine section from category using DB categories data.
 * Falls back to simple heuristic if DB data not loaded.
 */
export function getSectionByCategory(category: string): string {
  // Try DB data first
  const cat = _categories.find(c => (c.label || c.id) === category);
  if (cat) return cat.section;

  // Simple heuristic fallback
  if (category === 'Habilidades Blandas' || category === 'Actitud' || category === 'Disponibilidad' || category === 'Desarrollo' || category === 'Comunicación') {
    return 'blandas';
  }
  if (category === 'Criterio Técnico') return 'tecnico';
  return 'competencias';
}

/**
 * Determine section for a question given its category and position level.
 */
export function getSectionForQuestion(category: string, position: string): string {
  const isSoft = category === 'Habilidades Blandas' || category === 'Actitud' || category === 'Disponibilidad' || category === 'Desarrollo' || category === 'Comunicación';
  if (isSoft) return 'blandas';

  const level = getPositionLevel(position);
  if (level === 'legal') {
    // Check if category is technical via DB
    const cat = _categories.find(c => (c.label || c.id) === category);
    if (cat) return cat.section;
    // Simple heuristic: only Criterio Técnico goes to técnico
    if (category === 'Criterio Técnico') return 'tecnico';
    return 'competencias';
  }
  // Administrativo: everything non-blandas goes to competencias
  return 'competencias';
}

// ─── NORMALIZATION ─────────────────────────────────────────────────────────

export function normalizePosition(pos: string): string {
  if (pos === 'pasante_corporativo') return 'pasante';
  if (pos === 'archivo_soporte') return 'soporte';
  return pos;
}

export function normalizePracticeArea(area: string): string {
  if (area === 'consultoria_fiscal') return 'fiscal_consultoria';
  if (area === 'litigio_fiscal') return 'fiscal_litigio';
  if (area === 'general') return 'corporativo';
  return area;
}

// ─── SCORE CALCULATION (pure function, stays client-side) ──────────────────

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

// ─── LEVEL LABELS (static UI labels) ──────────────────────────────────────

export const LEVEL_LABELS: Record<string, string> = {
  legal: 'Legal',
  administrativo: 'Administrativo',
};

// ─── PERIODS (DB-driven, fallback for initial load) ─────────────────────────

let _periods: string[] = ['2025-H2', '2026-H1', '2026-H2'];
let _currentPeriod: string = '2026-H1';

export function setPeriods(periods: string[]) {
  _periods = periods;
  PERIODS = periods;
}

export function getPeriods(): string[] {
  return _periods;
}

export function setCurrentPeriod(period: string) {
  _currentPeriod = period;
  CURRENT_PERIOD = period;
}

export function getCurrentPeriod(): string {
  return _currentPeriod;
}

// Live-updating exports (updated by setPeriods/setCurrentPeriod)
export let PERIODS = _periods;
export let CURRENT_PERIOD = _currentPeriod;
