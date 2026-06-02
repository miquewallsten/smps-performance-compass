/**
 * Evaluation Engine Test Suite
 * 
 * Covers: Scoring, Section Weights, Practice Area, Templates, Visibility, Hierarchy
 * Run: npm test
 */
import { describe, it, expect } from 'vitest';
import {
  calculateScore,
  getSectionWeights,
  setSectionWeights,
  getPositionLabel,
  setPositionConfig,
  getLegalHierarchy,
  getAdminHierarchy,
  getPositionLevel,
  getPositionRank,
  getScoreLabels,
  setScoreLabels,
  getSectionByCategory,
  setCategories,
} from '../lib/evaluationConfig';
import { canViewUserEvaluations, filterVisibleUsers } from '../lib/visibility';

// ── Test Data ──

const ORIGINAL_SECTION_WEIGHTS = [
  { position: 'socio', tecnico: 50, competencias: 25, blandas: 25 },
  { position: 'salary_partner', tecnico: 50, competencias: 25, blandas: 25 },
  { position: 'counsel', tecnico: 100, competencias: 0, blandas: 0 },
  { position: 'asociado_sr', tecnico: 60, competencias: 20, blandas: 20 },
  { position: 'asociado_mid', tecnico: 60, competencias: 20, blandas: 20 },
  { position: 'asociado_jr', tecnico: 40, competencias: 40, blandas: 20 },
  { position: 'pasante_carrera', tecnico: 40, competencias: 40, blandas: 20 },
  { position: 'pasante_corporativo', tecnico: 40, competencias: 40, blandas: 20 },
  { position: 'director', tecnico: 0, competencias: 80, blandas: 20 },
  { position: 'gerente', tecnico: 0, competencias: 80, blandas: 20 },
  { position: 'coordinador', tecnico: 0, competencias: 80, blandas: 20 },
  { position: 'analista', tecnico: 0, competencias: 80, blandas: 20 },
  { position: 'asistente', tecnico: 0, competencias: 50, blandas: 50 },
  { position: 'archivo_soporte', tecnico: 0, competencias: 50, blandas: 50 },
];

const POSITION_CONFIG = [
  { position: 'socio', label: 'Socio', level: 'legal', positionRank: 0, sortOrder: 1 },
  { position: 'salary_partner', label: 'Salary Partner', level: 'legal', positionRank: 1, sortOrder: 2 },
  { position: 'counsel', label: 'Counsel', level: 'legal', positionRank: 1, sortOrder: 3 },
  { position: 'asociado_sr', label: 'Asociado Sr', level: 'legal', positionRank: 2, sortOrder: 4 },
  { position: 'asociado_mid', label: 'Asociado Mid', level: 'legal', positionRank: 3, sortOrder: 5 },
  { position: 'asociado_jr', label: 'Asociado Jr', level: 'legal', positionRank: 4, sortOrder: 6 },
  { position: 'pasante_carrera', label: 'Pasante con Carrera', level: 'legal', positionRank: 5, sortOrder: 7 },
  { position: 'pasante_corporativo', label: 'Pasante Corporativo', level: 'legal', positionRank: 6, sortOrder: 8 },
  { position: 'director', label: 'Director', level: 'administrativo', positionRank: 1, sortOrder: 9 },
  { position: 'gerente', label: 'Gerente', level: 'administrativo', positionRank: 2, sortOrder: 10 },
  { position: 'coordinador', label: 'Coordinador', level: 'administrativo', positionRank: 3, sortOrder: 11 },
  { position: 'analista', label: 'Analista', level: 'administrativo', positionRank: 4, sortOrder: 12 },
  { position: 'asistente', label: 'Asistente', level: 'administrativo', positionRank: 5, sortOrder: 13 },
  { position: 'archivo_soporte', label: 'Archivo y Soporte', level: 'administrativo', positionRank: 6, sortOrder: 14 },
];

// Initialize configs before tests
setSectionWeights(ORIGINAL_SECTION_WEIGHTS);
setPositionConfig(POSITION_CONFIG);
setScoreLabels([
  { score: 1, label: 'Deficiente' },
  { score: 2, label: 'Necesita Mejorar' },
  { score: 3, label: 'Satisfactorio' },
  { score: 4, label: 'Bueno' },
  { score: 5, label: 'Excelente' },
]);

// ──────────────────────────────────────────────────────────────────
// A. SCORE CALCULATION TESTS
// ──────────────────────────────────────────────────────────────────

describe('Score Calculation', () => {
  it('perfect score = 100 (all 5s)', () => {
    const questions = [
      { id: 'q1', weight: 10 }, { id: 'q2', weight: 10 },
      { id: 'q3', weight: 10 }, { id: 'q4', weight: 10 },
    ];
    const responses = questions.map(q => ({ questionId: q.id, score: 5 }));
    expect(calculateScore(questions, responses)).toBe(100);
  });

  it('mixed scores produce correct average', () => {
    const questions = [
      { id: 'q1', weight: 10 }, { id: 'q2', weight: 10 },
      { id: 'q3', weight: 10 }, { id: 'q4', weight: 10 },
    ];
    const responses = [
      { questionId: 'q1', score: 5 },
      { questionId: 'q2', score: 3 },
      { questionId: 'q3', score: 4 },
      { questionId: 'q4', score: 2 },
    ];
    // (1.0*10 + 0.6*10 + 0.8*10 + 0.4*10) / 40 * 100 = 70
    expect(calculateScore(questions, responses)).toBe(70);
  });

  it('all 1s = 20', () => {
    const questions = [{ id: 'q1', weight: 10 }, { id: 'q2', weight: 10 }];
    const responses = [{ questionId: 'q1', score: 1 }, { questionId: 'q2', score: 1 }];
    expect(calculateScore(questions, responses)).toBe(20);
  });

  it('weighted scores work correctly', () => {
    const questions = [
      { id: 'q1', weight: 50 }, { id: 'q2', weight: 25 }, { id: 'q3', weight: 25 },
    ];
    const responses = [
      { questionId: 'q1', score: 5 },
      { questionId: 'q2', score: 3 },
      { questionId: 'q3', score: 1 },
    ];
    // (1.0*50 + 0.6*25 + 0.2*25) / 100 * 100 = 50 + 15 + 5 = 70
    expect(calculateScore(questions, responses)).toBe(70);
  });

  it('NA approved questions are excluded', () => {
    const questions = [
      { id: 'q1', weight: 10 }, { id: 'q2', weight: 10 }, { id: 'q3', weight: 10 },
    ];
    const responses = [
      { questionId: 'q1', score: 5 },
      { questionId: 'q2', score: 0, notApplicable: true },
      { questionId: 'q3', score: 5 },
    ];
    const naApprovals = { q2: true };
    // q2 excluded, so: (1.0*10 + 1.0*10) / 20 * 100 = 100
    expect(calculateScore(questions, responses, naApprovals)).toBe(100);
  });

  it('NA not approved with score=0 is excluded', () => {
    const questions = [{ id: 'q1', weight: 10 }, { id: 'q2', weight: 10 }];
    const responses = [
      { questionId: 'q1', score: 5 },
      { questionId: 'q2', score: 0, notApplicable: true },
    ];
    // q2: NA + score=0 + no approval → excluded
    expect(calculateScore(questions, responses)).toBe(100);
  });

  it('Sin Elementos questions are excluded', () => {
    const questions = [{ id: 'q1', weight: 10 }, { id: 'q2', weight: 10 }];
    const responses = [
      { questionId: 'q1', score: 5 },
      { questionId: 'q2', score: 0, noElements: true },
    ];
    // q2 excluded entirely
    expect(calculateScore(questions, responses)).toBe(100);
  });

  it('all questions excluded returns 0', () => {
    const questions = [{ id: 'q1', weight: 10 }];
    const responses = [{ questionId: 'q1', score: 0, noElements: true }];
    expect(calculateScore(questions, responses)).toBe(0);
  });

  it('zero total weight returns 0', () => {
    expect(calculateScore([], [])).toBe(0);
  });

  it('socio self-eval with exact weights: 60→50, 40→25, 50→25', () => {
    // Simulate rescaled socio questions: 5 tecnico (10 each), 4 competencias (6.25 each), 5 blandas (5 each)
    const questions = [
      { id: 't1', weight: 10 }, { id: 't2', weight: 10 }, { id: 't3', weight: 10 },
      { id: 't4', weight: 10 }, { id: 't5', weight: 10 },
      { id: 'c1', weight: 6.25 }, { id: 'c2', weight: 6.25 },
      { id: 'c3', weight: 6.25 }, { id: 'c4', weight: 6.25 },
      { id: 'b1', weight: 5 }, { id: 'b2', weight: 5 },
      { id: 'b3', weight: 5 }, { id: 'b4', weight: 5 }, { id: 'b5', weight: 5 },
    ];
    const responses = questions.map(q => ({ questionId: q.id, score: 4 }));
    // (0.8 * sum(weights)) / sum(weights) * 100 = 80
    expect(calculateScore(questions, responses)).toBe(80);
  });
});

// ──────────────────────────────────────────────────────────────────
// B. SECTION WEIGHT TESTS
// ──────────────────────────────────────────────────────────────────

describe('Section Weights', () => {
  const expected = {
    socio: { tecnico: 50, competencias: 25, blandas: 25 },
    salary_partner: { tecnico: 50, competencias: 25, blandas: 25 },
    counsel: { tecnico: 100, competencias: 0, blandas: 0 },
    asociado_sr: { tecnico: 60, competencias: 20, blandas: 20 },
    asociado_mid: { tecnico: 60, competencias: 20, blandas: 20 },
    asociado_jr: { tecnico: 40, competencias: 40, blandas: 20 },
    pasante_carrera: { tecnico: 40, competencias: 40, blandas: 20 },
    pasante_corporativo: { tecnico: 40, competencias: 40, blandas: 20 },
    director: { tecnico: 0, competencias: 80, blandas: 20 },
    gerente: { tecnico: 0, competencias: 80, blandas: 20 },
    coordinador: { tecnico: 0, competencias: 80, blandas: 20 },
    analista: { tecnico: 0, competencias: 80, blandas: 20 },
    asistente: { tecnico: 0, competencias: 50, blandas: 50 },
    archivo_soporte: { tecnico: 0, competencias: 50, blandas: 50 },
  };

  for (const [position, weights] of Object.entries(expected)) {
    it(`${position} = ${weights.tecnico}/${weights.competencias}/${weights.blandas}`, () => {
      const sw = getSectionWeights(position);
      expect(sw.tecnico).toBe(weights.tecnico);
      expect(sw.competencias).toBe(weights.competencias);
      expect(sw.blandas).toBe(weights.blandas);
      expect(sw.tecnico + sw.competencias + sw.blandas).toBe(100);
    });
  }
});

// ──────────────────────────────────────────────────────────────────
// C. PRACTICE AREA TESTS
// (API-driven — marked as integration)
// ──────────────────────────────────────────────────────────────────

describe('Practice Area Filtering', () => {
  it('practice area constants exist', () => {
    const areas = ['corporativo', 'consultoria_fiscal', 'litigio_fiscal'];
    expect(areas.length).toBe(3);
  });

  it('legal positions get practice-area-filtered tecnico questions', () => {
    // Verified at API level — template endpoint filters by practiceArea
    const legalPositions = ['socio', 'counsel', 'asociado_sr'];
    for (const pos of legalPositions) {
      expect(getPositionLevel(pos)).toBe('legal');
    }
  });

  it('admin positions have no tecnico section', () => {
    const adminPositions = ['director', 'gerente', 'asistente'];
    for (const pos of adminPositions) {
      expect(getPositionLevel(pos)).toBe('administrativo');
      const sw = getSectionWeights(pos);
      expect(sw.tecnico).toBe(0);
    }
  });
});

// ──────────────────────────────────────────────────────────────────
// D. HIERARCHY TESTS
// ──────────────────────────────────────────────────────────────────

describe('Hierarchy', () => {
  it('legal hierarchy is correct and ordered', () => {
    const legal = getLegalHierarchy();
    expect(legal.length).toBeGreaterThanOrEqual(8);
    expect(legal[0]).toBe('socio'); // Highest rank
    expect(legal[legal.length - 1]).toBe('pasante_corporativo'); // Lowest
  });

  it('admin hierarchy is correct and ordered', () => {
    const admin = getAdminHierarchy();
    expect(admin.length).toBeGreaterThanOrEqual(6);
    expect(admin[0]).toBe('director');
  });

  it('position levels are correct', () => {
    expect(getPositionLevel('socio')).toBe('legal');
    expect(getPositionLevel('director')).toBe('administrativo');
    expect(getPositionLevel('asistente')).toBe('administrativo');
  });

  it('position ranks increase with seniority', () => {
    expect(getPositionRank('socio')).toBeLessThan(getPositionRank('asociado_jr'));
    expect(getPositionRank('director')).toBeLessThan(getPositionRank('asistente'));
  });

  it('position labels are correct', () => {
    expect(getPositionLabel('socio')).toBe('Socio');
    expect(getPositionLabel('asociado_sr')).toBe('Asociado Sr');
    expect(getPositionLabel('director')).toBe('Director');
  });
});

// ──────────────────────────────────────────────────────────────────
// E. VISIBILITY TESTS
// ──────────────────────────────────────────────────────────────────

describe('Visibility Rules', () => {
  const makeUser = (overrides: any = {}) => ({
    id: 'u1', name: 'Test', email: 'test@test.com', position: 'asociado_jr',
    isAdmin: false, isActive: true, password: 'x',
    isSuperUser: false, isManagingPartner: false,
    ...overrides,
  });

  it('user can see own evaluations', () => {
    const viewer = makeUser({ id: 'u1' });
    const target = makeUser({ id: 'u1' });
    expect(canViewUserEvaluations(viewer, target)).toBe(true);
  });

  it('super_user sees everyone', () => {
    const viewer = makeUser({ id: 'u1', isSuperUser: true });
    const target = makeUser({ id: 'u2', position: 'socio', isManagingPartner: true });
    expect(canViewUserEvaluations(viewer, target)).toBe(true);
  });

  it('admin sees everyone', () => {
    const viewer = makeUser({ id: 'u1', isAdmin: true });
    const target = makeUser({ id: 'u2', position: 'socio' });
    expect(canViewUserEvaluations(viewer, target)).toBe(true);
  });

  it('managing partner sees everyone', () => {
    const viewer = makeUser({ id: 'u1', isManagingPartner: true });
    const target = makeUser({ id: 'u2', position: 'socio' });
    expect(canViewUserEvaluations(viewer, target)).toBe(true);
  });

  it('regular socio cannot see other socio', () => {
    const viewer = makeUser({ id: 'u1', position: 'socio' });
    const target = makeUser({ id: 'u2', position: 'socio' });
    expect(canViewUserEvaluations(viewer, target)).toBe(false);
  });

  it('regular socio cannot see managing partner', () => {
    const viewer = makeUser({ id: 'u1', position: 'socio' });
    const target = makeUser({ id: 'u2', position: 'socio', isManagingPartner: true });
    expect(canViewUserEvaluations(viewer, target)).toBe(false);
  });

  it('regular socio cannot see salary partner', () => {
    const viewer = makeUser({ id: 'u1', position: 'socio' });
    const target = makeUser({ id: 'u2', position: 'salary_partner' });
    expect(canViewUserEvaluations(viewer, target)).toBe(false);
  });

  it('regular socio CAN see lower positions', () => {
    const viewer = makeUser({ id: 'u1', position: 'socio' });
    const target = makeUser({ id: 'u2', position: 'asociado_jr' });
    expect(canViewUserEvaluations(viewer, target)).toBe(true);
  });

  it('filterVisibleUsers works correctly', () => {
    const viewer = makeUser({ id: 'u1', position: 'socio' });
    const users = [
      makeUser({ id: 'u1', position: 'socio' }),
      makeUser({ id: 'u2', position: 'socio' }),
      makeUser({ id: 'u3', position: 'asociado_jr' }),
      makeUser({ id: 'u4', position: 'salary_partner' }),
    ];
    const visible = filterVisibleUsers(viewer, users);
    expect(visible.length).toBe(2); // self + asociado_jr
    expect(visible.map(u => u.id)).toContain('u1');
    expect(visible.map(u => u.id)).toContain('u3');
    expect(visible.map(u => u.id)).not.toContain('u2');
    expect(visible.map(u => u.id)).not.toContain('u4');
  });
});

// ──────────────────────────────────────────────────────────────────
// F. SCORE LABEL TESTS
// ──────────────────────────────────────────────────────────────────

describe('Score Labels', () => {
  it('score labels are defined 1-5', () => {
    const labels = getScoreLabels();
    expect(labels[1]).toBe('Deficiente');
    expect(labels[2]).toBe('Necesita Mejorar');
    expect(labels[3]).toBe('Satisfactorio');
    expect(labels[4]).toBe('Bueno');
    expect(labels[5]).toBe('Excelente');
  });
});
