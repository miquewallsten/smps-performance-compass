# Dashboard Notification Widgets

## Pending Actions Widget

**Endpoint:** GET /api/notifications/pending-actions?period={currentPeriod}

**Returns:** Array of action items requiring user attention

| Action Type | Display | Priority |
|---|---|---|
| complete_self_eval | "Completar autoevaluación" | High |
| complete_supervisor_eval | "Evaluar a {name}" | High |
| complete_feedback | "Sesión de feedback con {name}" | Medium |
| approve_action_plan | "Aprobar plan de acción de {name}" | Medium |
| approve_vacation | "Aprobar vacaciones de {name}" | Low |

**Sorting:** By deadline (urgent first), no deadline last.

**Role-specific:**
- Employee: own pending self-eval only
- Supervisor: own + direct reports' pending items
- Admin/Socio: all pending items across the firm

## Notification Badge

**Endpoint:** GET /api/notifications/count

**Display:** Small badge on bell icon showing unread count.

**Polling:** Every 60 seconds via `useUnreadNotificationCount()` hook.

## Notification Panel

**Endpoint:** GET /api/notifications

**Display:** Scrollable list of recent notifications with:
- Type icon (ℹ️/⏰/⚠️/✅/🔴)
- Title
- Body (truncated)
- Time ago
- Click → mark read + navigate to actionUrl

**Implementation Status:**
- Backend: ✅ Deployed
- Frontend hooks: ✅ Added to queries.ts
- Frontend UI: ❌ Not yet built (Dashboard/Nav components need update)
