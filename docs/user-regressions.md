# User Regressions — SMPS Final Stabilization

Date: 2026-06-01

## Fixed Regressions

### R01 — Dashboard Per-Employee Status Table
- **Severity**: MEDIUM
- **Original Behavior**: Dashboard showed expandable cards with "Empleados", "Evaluados", "Progreso por Posición", each displaying individual employees grouped by Legal/Administrativo with their evaluation status (✓ Auto, ✓ Eval, score).
- **Current Behavior Before Fix**: Dashboard only showed aggregate analytics metrics and quick action links. No per-employee detail.
- **Fix Applied**: Restored original Dashboard layout with:
  - Expandable cards (Empleados, Evaluados, Progreso)
  - Per-employee status table grouped by Legal/Administrativo
  - Level filter (Todos/Legal/Administrativo)
  - "Mi Autoevaluación" card
  - "Evaluaciones Pendientes" card
  - "Promedio General" stat
- **Files Modified**: `src/pages/Dashboard.tsx`
- **Verification**: Deployed to production, verified API calls returning correct data.

### R02 — Reports Area Filter
- **Severity**: MEDIUM
- **Original Behavior**: Reports had area filter buttons (Todas las áreas / Legal / Administrativo) that filtered all data by position level.
- **Current Behavior Before Fix**: No area filter existed.
- **Fix Applied**: Restored area filter with three buttons using `getPositionLevel()` from DB-driven config.
- **Files Modified**: `src/pages/Reports.tsx`
- **Verification**: Deployed to production.

### R03 — Reports Self-Eval by Position Chart
- **Severity**: LOW
- **Original Behavior**: "Autoevaluaciones por Nivel" bar chart showing completed vs pending per position.
- **Current Behavior Before Fix**: Missing.
- **Fix Applied**: Restored self-eval by position bar chart, filtered by selected area.
- **Files Modified**: `src/pages/Reports.tsx`
- **Verification**: Deployed to production.

### R04 — Reports Supervisor Eval by Position Chart
- **Severity**: LOW
- **Original Behavior**: "Evaluaciones de Evaluadores por Nivel" bar chart showing completed vs pending supervisor evaluations per position.
- **Current Behavior Before Fix**: Missing.
- **Fix Applied**: Restored supervisor eval by position bar chart, filtered by selected area.
- **Files Modified**: `src/pages/Reports.tsx`
- **Verification**: Deployed to production.

## Remaining Regressions

### R05 — Password Reset via Email (SMTP Not Configured)
- **Severity**: HIGH (but not a functional regression - original used security questions)
- **Original Behavior**: Password reset via security questions.
- **Current Behavior**: Email-based password reset implemented but SMTP not configured on Hostinger.
- **Impact**: Users cannot reset passwords via email. Legacy security question flow still works as fallback.
- **Resolution**: Configure SMTP on Hostinger or use Resend free tier.
- **No code changes needed** — only infrastructure configuration.

## Architecture Changes (Not Regressions)

These are intentional improvements, not regressions:

| Change | Original | Current | Reason |
|--------|----------|---------|--------|
| Data source | Hardcoded | DB-driven | Scalability |
| Auth | Security questions | Email-based tokens | Security |
| Period config | Hardcoded CURRENT_PERIOD | DB-driven useCurrentPeriod() | Configurability |
| Templates | Hardcoded per position | DB-driven per position+area | Maintainability |
| Notifications | None | Full notification system | Business value |
| Analytics | None | Analytics summary tables | Reporting |
| Audit logging | None | Authentication_audit table | Security |
