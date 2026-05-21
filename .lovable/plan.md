# Plan

Cambio amplio que toca tipos, datos semilla, plantillas, evaluaciones, gestión de usuarios y objetivos. Lo divido en 4 bloques. Confirma para arrancar (o pídeme reordenar/recortar).

## 1. Áreas de práctica + criterios técnicos por puesto

**Nuevo concepto: `PracticeArea`** para puestos Legales.
- Valores: `corporativo` | `consultoria_fiscal` | `litigio_fiscal` | `general` (default para quienes aún no estén asignados).
- Se asigna por **usuario** (`User.practiceArea`) — el mismo nivel (p. ej. Asociado Sr) puede vivir en cualquier práctica.

**Catálogo de preguntas técnicas (del XLSX)**
- Nuevo archivo `src/data/technicalQuestions.ts` con la matriz: práctica × posición → 5 preguntas (las del archivo).
- Cada pregunta marcada con `section: 'tecnico'`, `category: 'Criterio Técnico'` y `practiceArea`.
- Pesos por pregunta: se reparten equitativamente dentro de su sección (5 preguntas → 20% relativo cada una, luego escaladas al peso de la sección, ver bloque 2).

**Resolución de preguntas para una evaluación**
- `getQuestionsForUser(user, period)` arma la lista uniendo:
  1. Técnicas del par (práctica, posición) — solo Legal.
  2. Competencias de la plantilla por posición (lo que ya existe en `QUESTIONS_BY_POSITION`, filtrando categorías de competencias).
  3. Habilidades blandas de la plantilla.
- Reemplaza los usos directos de `QUESTIONS_BY_POSITION[pos]` en `SelfEvaluation.tsx`, `Evaluations.tsx`, `EvaluationViewer.tsx`.

## 2. Pesos por sección (Criterio Técnico / Competencias / Blandas)

Tabla del XLSX (página 2) como configuración:

```text
                          Técnico  Competencias  Blandas
Socio / Salary Partner      50%       25%           25%
Asociado Sr / Mid           60%       20%           20%
Asociado Jr / Pasantes      40%       40%           20%
Director / Coordinador      40%       40%           20%    (Admin)
Staff de soporte            30%       50%           20%    (Admin)
```

**Implementación**
- `src/data/sectionWeights.ts` con `SECTION_WEIGHTS: Record<Position, {tecnico, competencias, blandas}>`.
  - Admin sin sección "técnico" → ese 40% se redistribuye a Competencias (no aplica criterio técnico para admin).
- `EvaluationTemplates.tsx`:
  - Render por sección con encabezado mostrando **peso total de la sección** (editable solo para admin).
  - Validación: suma de pesos de cada pregunta dentro de la sección = 100% relativo; las 3 secciones suman 100% global automáticamente vía `SECTION_WEIGHTS`.
- Cálculo de score en `Evaluations.tsx` y `Reports.tsx`: score por sección × peso de sección → score total.
- Recalculo con "No Aplica" / "Sin Elementos" se mantiene **dentro de la sección** (no entre secciones).

## 3. Alta de posiciones nuevas

Hoy `Position` es un union literal — para permitir alta dinámica:
- Convertir a `string` en runtime + mantener `BUILTIN_POSITIONS` como semilla.
- Nuevo `customPositions` en `AppContext` con `{ id, label, level: 'legal'|'administrativo', practiceArea?, rank }`.
- Nueva pantalla mini en `UserManagement.tsx` (o sección dentro): "Posiciones" con tabla + botón "Agregar posición" → modal con nombre, nivel, práctica (si legal), y posición de referencia para heredar plantilla.
- Las nuevas posiciones aparecen automáticamente en:
  - Selector de posición en formularios de usuario.
  - `EvaluationTemplates.tsx` (heredan la plantilla del puesto de referencia, editable).
  - `SECTION_WEIGHTS` (heredan del puesto de referencia).
  - Jerarquía (`POSITION_HIERARCHY`, `LEGAL_HIERARCHY`, `ADMIN_HIERARCHY`) — vía helpers que combinan builtin + custom.

## 4. Objetivos administrativos con flujo de aprobación

Hoy `PersonalObjectives.adminObjectives` se guarda directo. Cambios:
- `AdminObjective` gana: `status: 'draft'|'pending'|'approved'|'rejected'`, `submittedAt?`, `approvedBy?`, `approvedAt?`, `reviewerComment?`.
- En `PersonalObjectives.tsx`:
  - El **propio empleado admin** puede crear/editar sus objetivos cuando están en `draft`.
  - Botón "Enviar a aprobación" → status `pending`, bloquea edición.
  - El **evaluador asignado** ve sección "Pendientes de aprobar" con Aprobar / Rechazar + comentario.
  - Si rechaza → vuelve a `draft` con el comentario visible.
  - Solo objetivos `approved` cuentan en cálculos / reportes.
- No afecta a objetivos Legales (siguen como hoy).

## Archivos a tocar

- `src/types/index.ts` — `PracticeArea`, ampliar `EvalQuestion`/`User`/`AdminObjective`, helpers de posiciones.
- `src/data/technicalQuestions.ts` (nuevo) — matriz del XLSX.
- `src/data/sectionWeights.ts` (nuevo) — pesos por nivel.
- `src/data/questions.ts` — separar competencias/blandas, exponer helpers por sección.
- `src/contexts/AppContext.tsx` — `customPositions`, helpers, persistencia.
- `src/pages/UserManagement.tsx` — alta de posición, asignación de práctica al usuario.
- `src/pages/EvaluationTemplates.tsx` — render por sección con pesos.
- `src/pages/SelfEvaluation.tsx`, `Evaluations.tsx`, `EvaluationViewer.tsx` — agrupar por sección, usar `getQuestionsForUser`.
- `src/pages/PersonalObjectives.tsx` — flujo de aprobación de objetivos admin.
- `src/pages/Reports.tsx` — totales ponderados por sección.

## Orden de ejecución sugerido

1. **Bloque 1+2** (datos y pesos) — base para todo lo demás.
2. **Bloque 4** (aprobación objetivos admin) — aislado.
3. **Bloque 3** (alta de posiciones) — último porque toca tipos transversales.

¿Procedo con todo en este orden, o prefieres entregar bloque por bloque revisando entre cada uno?
