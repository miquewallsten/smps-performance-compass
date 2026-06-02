# User Hierarchy Forensics

## Original Hierarchy Model

The original app used **hardcoded constants** for hierarchy:

```typescript
// src/types/index.ts
export const LEGAL_HIERARCHY: Position[] = [
  'socio', 'salary_partner', 'counsel', 'asociado_sr', 'asociado_mid', 'asociado_jr', 'pasante_carrera', 'pasante_corporativo',
];

export const ADMIN_HIERARCHY: Position[] = [
  'director', 'gerente', 'coordinador', 'analista', 'asistente', 'archivo_soporte',
];

export const POSITION_RANK: Record<Position, number> = {
  socio: 0, salary_partner: 1, counsel: 1, director: 1,
  asociado_sr: 2, gerente: 2, asociado_mid: 3, coordinador: 3,
  asociado_jr: 4, analista: 4, pasante_carrera: 5, asistente: 5,
  pasante_corporativo: 6, archivo_soporte: 6, dummy: 99,
};

export const POSITION_LABELS: Record<Position, string> = {
  socio: 'Socio', salary_partner: 'Salary Partner', counsel: 'Counsel',
  asociado_sr: 'Asociado Sr', asociado_mid: 'Asociado Mid',
  asociado_jr: 'Asociado Jr', pasante_carrera: 'Pasante con Carrera',
  pasante_corporativo: 'Pasante Corporativo', director: 'Director',
  gerente: 'Gerente', coordinador: 'Coordinador', analista: 'Analista',
  asistente: 'Asistente', archivo_soporte: 'Archivo y Soporte', dummy: 'Dummy',
};
```

## Current Hierarchy Model

The current app uses **database-driven hierarchy**:

```typescript
// src/lib/evaluationConfig.ts
export function getLegalHierarchy(): string[] {
  return _positionConfig
    .filter(p => p.level === 'legal' && p.position !== 'dummy')
    .sort((a, b) => a.positionRank - b.positionRank)
    .map(p => p.position);
}
```

With DB values:
| Position | Label | Level | Rank |
|----------|-------|-------|------|
| socio | Socio | legal | 0 |
| salary_partner | Salary Partner | legal | 1 |
| counsel | Counsel | legal | 1 |
| asociado_sr | Asociado Sr | legal | 2 |
| asociado_mid | Asociado Mid | legal | 3 |
| asociado_jr | Asociado Jr | legal | 4 |
| pasante_carrera | Pasante con Carrera | legal | 5 |
| pasante_corporativo | Pasante | legal | 6 |
| pasante | Pasante | legal | 6 | ← NEW
| director | Director | administrativo | 1 |
| gerente | Gerente | administrativo | 2 |
| coordinador | Coordinador | administrativo | 3 |
| analista | Analista | administrativo | 4 |
| asistente | Asistente | administrativo | 5 |
| archivo_soporte | Archivo y Soporte | administrativo | 6 |
| soporte | Soporte | administrativo | 6 | ← NEW
| archivista | Archivista | administrativo | 6 | ← NEW |

## Differences

| Aspect | Original | Current | Impact |
|--------|----------|---------|--------|
| `pasante` position | Not in hierarchy | In DB (rank 6) | ⚠️ New position, not in original |
| `soporte` position | Not in hierarchy | In DB (rank 6) | ⚠️ Was `archivo_soporte` in original |
| `archivista` position | Not in hierarchy | In DB (rank 6) | ⚠️ New position, not in original |
| `pasante_corporativo` label | "Pasante Corporativo" | "Pasante" | ⚠️ Label changed |

## Supervisor Assignment Logic

**Original:** `useAssignments(CURRENT_PERIOD)` → fetches all assignments for the hardcoded period.

**Current:** `useAssignments(currentPeriod)` → fetches all assignments for the DB-resolved current period.

**Both** use the `supervisor_assignments` table with the same structure.

## Org Chart

**Original:** Groups by `LEGAL_HIERARCHY` and `ADMIN_HIERARCHY` constants. Shows supervisors as cards with their team members.

**Current:** Groups by `getLegalHierarchy()` and `getAdminHierarchy()` from DB. Same card layout.

**Regression:** None. The org chart correctly uses DB-driven hierarchies. ✅

## Visibility Rules

**Original and current both use** `canViewUserEvaluations()`:
- SuperUser: sees all
- Admin: sees all
- Managing Partner: sees all
- Regular Socio: sees all EXCEPT other Socios and Salary Partners
- Other users: visibility handled by supervisor assignments

**This function is IDENTICAL in both codebases.** ✅

## Assessment

| Aspect | Original | Current | Match? |
|--------|----------|---------|--------|
| Hierarchy definition | Hardcoded constants | DB-driven | ✅ |
| Position labels | Hardcoded constant | DB-driven | ✅ |
| Supervisor assignments | Per-period in DB | Per-period in DB | ✅ |
| Visibility rules | canViewUserEvaluations() | Same function | ✅ |
| Org chart rendering | LEGAL/ADMIN groups | Same groups from DB | ✅ |
| Position ranks | Hardcoded POSITION_RANK | DB position_rank | ✅ |
| New positions | 14 positions | 17 positions (pasante, soporte, archivista) | ⚠️ Extra positions |
