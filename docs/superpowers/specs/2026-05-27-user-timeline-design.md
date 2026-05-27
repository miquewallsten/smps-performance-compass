# User Timeline Design Spec

**Date:** 2026-05-27  
**Status:** Approved  
**Register:** product

## Overview

A per-user timeline that records every significant event in an employee's history at SMPS — position changes (promotions, lateral moves, demotions), hiring, termination, reactivation, evaluation completions with scores, role changes (admin, managing partner), supervisor assignments, period transitions, and action plan milestones.

Every user sees their own timeline on their profile. Admins and SuperUsers can see any user's timeline from User Management.

## Event Types

| Event Type | Source | Data Points |
|------------|--------|-------------|
| `position_change` | Manual log or detected on user update | old_position, new_position, change_type (promotion/demotion/lateral), custom_position_id, note |
| `hire` | Created when user first created or reactivated after termination | position, custom_position_id, note |
| `termination` | When user is deactivated | reason (optional), note |
| `reactivation` | When deactivated user is reactivated | note |
| `evaluation_completed` | Auto-logged when evaluation is completed | period, type (self/supervisor), score, evaluator_name |
| `role_change` | When isAdmin, isManagingPartner, isSuperUser changes | old_roles, new_roles, note |
| `supervisor_assigned` | When supervisor assignment is created | supervisor_name, period |
| `supervisor_removed` | When supervisor assignment is deleted | supervisor_name, period |
| `period_transition` | When a new evaluation period starts | period |
| `action_plan_milestone` | When action plan is approved or completed | plan_id, status |
| `password_reset` | When admin resets a user's password | note |
| `note` | Free-form note added by admin or superuser | content, added_by |

## Data Model

### Table: `user_timeline`

```sql
CREATE TABLE IF NOT EXISTS user_timeline (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  old_value TEXT,
  new_value TEXT,
  metadata TEXT,  -- JSON: flexible key-value pairs per event type
  note TEXT,
  created_by VARCHAR(36),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_timeline_user_date (user_id, event_date DESC),
  INDEX idx_timeline_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Metadata JSON shapes by event type

Each event stores typed metadata in the `metadata` JSON column:

```typescript
interface TimelineEvent {
  id: string;
  userId: string;
  eventType: 'position_change' | 'hire' | 'termination' | 'reactivation' 
    | 'evaluation_completed' | 'role_change' | 'supervisor_assigned' 
    | 'supervisor_removed' | 'period_transition' | 'action_plan_milestone'
    | 'password_reset' | 'note';
  eventDate: string;
  oldValue?: string;  // previous value (e.g. old position name)
  newValue?: string;  // new value (e.g. new position name)
  metadata?: Record<string, unknown>;  // typed per event
  note?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// metadata shapes:
type PositionChangeMeta = { changeType: 'promotion' | 'demotion' | 'lateral'; customPositionId?: string };
type EvaluationMeta = { period: string; evalType: 'self' | 'supervisor'; score: number; evaluatorName?: string };
type RoleChangeMeta = { oldRoles: string[]; newRoles: string[] };
type SupervisorMeta = { supervisorName: string; period: string };
type ActionPlanMeta = { planId: string; status: 'approved' | 'completed' };
```

## Automatic Event Logging

The system automatically logs timeline events when certain actions happen. These are not optional — they fire from existing API endpoints:

| Trigger | Event Type | Logged By |
|---------|------------|-----------|
| User created (POST /api/users) | `hire` | system |
| User deactivated (DELETE /api/users/:id) | `termination` | admin who deactivates |
| User reactivated (PATCH /api/users/:id isActive=true) | `reactivation` | admin who reactivates |
| User position changed (PATCH /api/users/:id) | `position_change` | system (auto-detects change) |
| User role changed (PATCH /api/users/:id/role) | `role_change` | admin who changes role |
| Evaluation completed (PATCH /api/evaluations/:id) | `evaluation_completed` | system |
| Supervisor assigned (POST /api/assignments) | `supervisor_assigned` | admin |
| Supervisor removed (DELETE /api/assignments/:id) | `supervisor_removed` | admin |
| Action plan approved (POST /api/action-plans/:id/approve) | `action_plan_milestone` | system |
| Admin resets password (POST /api/users/:id/reset-password) | `password_reset` | admin |

## API Endpoints

### GET /api/users/:id/timeline
Returns timeline events for a user. Accessible by:
- The user themselves (own timeline)
- Admins and SuperUsers (any user's timeline)

Query params:
- `?type=position_change` — filter by event type
- `?from=2024-01-01&to=2026-12-31` — date range filter
- `?limit=50&offset=0` — pagination

Response:
```json
{
  "events": [...],
  "total": 42,
  "hasMore": true
}
```

### POST /api/users/:id/timeline
Add a manual note event. Admin/SuperUser only.

```json
{
  "eventType": "note",
  "note": "Promoted to Senior Associate for exceptional performance"
}
```

### POST /api/users/:id/timeline/:eventId
Update the note on an existing event. Admin/SuperUser only. Only the `note` field can be updated.

### DELETE /api/users/:id/timeline/:eventId
Delete a timeline event. SuperUser only.

## Frontend: Timeline Page

### Route
`/users/:id/timeline` — accessed from User Management (admin) or My Profile (self)

### Layout

Vertical timeline with a center line. Events branch left for "status/context" info and right for "action/detail" info. Date markers sit on the center line.

```
     ●─── 15 Ene 2026 ───────────────────────
     │
  [P] │  🎯 Contratado
     │     Asociado Sr · Fiscal Consultoría
     │     Por: SuperAdmin
     │
     ●─── 20 Mar 2026 ───────────────────────
     │
  [E] │  📊 Autoevaluación completada
     │     Periodo 2026-H1 · Calificación: 87%
     │
     ●─── 01 Abr 2026 ───────────────────────
     │
  [R] │  ⬆ Promoción
     │     De: Asociado Mid → Asociado Sr
     │     Nota: Promoción por desempeño destacado
     │
     ●─── 15 May 2026 ───────────────────────
     │
  [S] │  👤 Asignado a supervisor
     │     Lic. Carlos Mendoza · Periodo 2026-H1
```

Each event card shows:
- **Left side:** Event type icon + label (color-coded by category)
- **Center:** Date marker on the timeline line
- **Right side:** Details — old/new values, score, names, note

### Color Coding by Category

| Category | Color | Icon |
|----------|-------|------|
| Career (position_change, hire, termination, reactivation) | Gold (smps-gold) | ArrowUp/ArrowDown/UserPlus/UserMinus |
| Evaluations (evaluation_completed) | Accent (smps-red) | BarChart3 |
| Roles (role_change) | Navy (smps-navy) | Shield |
| Supervision (supervisor_assigned/removed) | Slate blue | UserCheck/UserX |
| Periods (period_transition) | Muted | Calendar |
| Action plans (action_plan_milestone) | Green (smps-success) | CheckCircle |
| Notes | Muted foreground | MessageSquare |
| Security (password_reset) | Warning | Key |

### Interactions
- Click event card to expand/collapse details
- "Add note" button at top (admin/SuperUser only) — opens inline form
- Date range filter at top
- Event type filter (checkboxes or pills)
- Search within timeline

### Mobile
- Full-width cards, no center line
- Date markers as section headers
- Simplified icons, no branching

## Implementation Plan

### Phase 1: Backend (database + API)
1. Add `user_timeline` table to migration
2. Add migration for existing DBs (ALTER TABLE)
3. Create `server/routes/timeline.ts` with GET/POST/DELETE endpoints
4. Hook into existing routes to auto-log events (users, evaluations, assignments, action-plans)
5. Rebuild server.cjs

### Phase 2: Frontend (timeline UI)
1. Create `src/pages/UserTimeline.tsx` page component
2. Add route to `src/App.tsx`
3. Add "Ver Historial" link in User Management row + My Profile
4. Add timeline API queries to `src/api/queries.ts`
5. Build the vertical timeline UI with color-coded event cards
6. Add "Add note" form for admins
7. Add date range and event type filters

### Phase 3: Seed historical data
1. Create a one-time migration script that backfills timeline events from existing data (evaluations, assignments, user creation dates)
