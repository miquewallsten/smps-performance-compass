# SMPS API INVENTORY

Generated: 2026-06-01

---

## API Endpoint Summary

### Authentication
| Method | Route | Auth Required | Role Required | Description |
|--------|-------|---------------|---------------|-------------|
| POST | `/api/auth/login` | No | — | Login with email/password |
| POST | `/api/auth/logout` | Yes | Any | Invalidate JWT session |
| GET | `/api/auth/me` | Yes | Any | Get current user profile |
| POST | `/api/auth/change-password` | Yes | Any | Change password (current + new) |
| POST | `/api/auth/activate` | No | — | Activate account with token |
| GET | `/api/auth/verify-activation` | No | — | Verify activation token validity |
| POST | `/api/auth/resend-activation` | No | — | Resend activation email |
| POST | `/api/auth/request-password-reset` | No | — | Request password reset email |
| GET | `/api/auth/verify-reset-token` | No | — | Verify password reset token |
| POST | `/api/auth/complete-password-reset` | No | — | Complete password reset with token |
| POST | `/api/auth/security-question` | No | — | DISABLED (410 Gone) |
| POST | `/api/auth/reset-password` | No | — | DISABLED (410 Gone) |

### Users
| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| GET | `/api/users` | Yes | admin/super_user/socio | List all users |
| GET | `/api/users/:id` | Yes | self/supervisor/admin/socio | Get single user |
| POST | `/api/users` | Yes | admin/super_user | Create user |
| PATCH | `/api/users/:id` | Yes | self/admin/super_user | Update user |
| DELETE | `/api/users/:id` | Yes | admin/super_user | Soft-delete (deactivate) user |
| POST | `/api/users/:id/reset-password` | Yes | admin/super_user | Send password reset email |
| PATCH | `/api/users/:id/role` | Yes | admin/super_user | Update user role |

### Evaluations
| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| GET | `/api/evaluations` | Yes | filtered | List evaluations (role-filtered) |
| GET | `/api/evaluations/export/csv` | Yes | admin/socio | Export evaluations as CSV |
| GET | `/api/evaluations/:id` | Yes | owner/supervisor/admin | Get single evaluation |
| POST | `/api/evaluations` | Yes | self/supervisor/admin | Create evaluation |
| PATCH | `/api/evaluations/:id` | Yes | owner/supervisor/admin | Update evaluation |
| PATCH | `/api/evaluations/:id/feedback` | Yes | supervisor/admin | Complete feedback session |
| PATCH | `/api/evaluations/:id/na-approval` | Yes | supervisor/admin | Approve/reject N/A |

### Assignments
| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| GET | `/api/assignments` | Yes | filtered | List assignments (role-filtered) |
| POST | `/api/assignments` | Yes | admin | Create assignment |
| DELETE | `/api/assignments/:id` | Yes | admin | Delete assignment |

### Action Plans
| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| GET | `/api/action-plans` | Yes | filtered | List action plans |
| POST | `/api/action-plans` | Yes | self/supervisor/admin | Create action plan |
| PATCH | `/api/action-plans/:id` | Yes | owner/supervisor/admin | Update action plan |
| POST | `/api/action-plans/:id/approve` | Yes | supervisor/admin | Approve/reject plan |

### Objectives
| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| GET | `/api/objectives` | Yes | filtered | List objectives |
| POST | `/api/objectives` | Yes | self/supervisor/admin | Create objectives |
| POST | `/api/objectives/:id/submit` | Yes | owner/admin | Submit for review |
| POST | `/api/objectives/:id/review` | Yes | supervisor/admin | Review objective |

### Vacations
| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| GET | `/api/vacations/requests` | Yes | filtered | List vacation requests |
| POST | `/api/vacations/requests` | Yes | self/supervisor/admin | Create vacation request |
| PATCH | `/api/vacations/requests/:id` | Yes | owner/supervisor/admin | Update request |
| POST | `/api/vacations/requests/:id/approve` | Yes | supervisor | Approve/reject request |
| DELETE | `/api/vacations/requests/:id` | Yes | owner(admin)/admin | Cancel request |
| GET | `/api/vacations/config` | Yes | admin | Get vacation config |
| PATCH | `/api/vacations/config` | Yes | admin | Update vacation config |
| POST | `/api/vacations/extra-days` | Yes | admin | Grant extra vacation days |

### Periods
| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| GET | `/api/periods` | Yes | Any | List period configs |
| POST | `/api/periods` | Yes | admin | Create/update period config |

### Analytics
| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| GET | `/api/analytics/overview` | Yes | filtered | Period overview KPIs |
| GET | `/api/analytics/evaluations` | Yes | filtered | Evaluation analytics |
| GET | `/api/analytics/trends` | Yes | Any | Period-over-period trends |
| GET | `/api/analytics/objectives` | Yes | filtered | Objective analytics |
| GET | `/api/analytics/vacations` | Yes | filtered | Vacation analytics |
| GET | `/api/analytics/action-plans` | Yes | filtered | Action plan analytics |

### Notifications
| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| GET | `/api/notifications` | Yes | self | List notifications |
| GET | `/api/notifications/count` | Yes | self | Get unread count |
| PATCH | `/api/notifications/:id/read` | Yes | self | Mark notification read |
| POST | `/api/notifications/read-all` | Yes | self | Mark all read |
| GET | `/api/notifications/preferences` | Yes | self | Get preferences |
| PATCH | `/api/notifications/preferences` | Yes | self | Update preferences |
| GET | `/api/notifications/pending-actions` | Yes | self | Get pending actions for dashboard |

### Evaluation Config
| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| GET | `/api/evaluation-config/categories` | Yes | Any | List categories |
| POST | `/api/evaluation-config/categories` | Yes | admin | Create category |
| GET | `/api/evaluation-config/section-weights` | Yes | Any | List section weights |
| GET | `/api/evaluation-config/section-weights/:position` | Yes | Any | Get weights for position |
| PATCH | `/api/evaluation-config/section-weights/:position` | Yes | admin | Update weights |
| GET | `/api/evaluation-config/competencies` | Yes | Any | List competencies |
| GET | `/api/evaluation-config/competencies/:level` | Yes | Any | Get competencies for level |
| GET | `/api/evaluation-config/template-questions` | Yes | Any | List template questions |
| PUT | `/api/evaluation-config/template-questions/:position` | Yes | admin | Replace questions for position |
| PATCH | `/api/evaluation-config/template-questions/:id` | Yes | admin | Update single question |
| GET | `/api/evaluation-config/full-template/:position` | Yes | Any | Get assembled template |
| GET | `/api/evaluation-config/positions` | Yes | Any | List positions |
| GET | `/api/evaluation-config/score-labels` | Yes | Any | Get score labels |
| GET | `/api/evaluation-config/library` | Yes | Any | List library questions |
| POST | `/api/evaluation-config/library` | Yes | admin | Create library question |
| PATCH | `/api/evaluation-config/library/:id` | Yes | admin | Update library question |
| DELETE | `/api/evaluation-config/library/:id` | Yes | admin | Delete library question |
| POST | `/api/evaluation-config/reseed` | Yes | admin | Re-seed evaluation data |

### Announcements
| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| GET | `/api/announcements` | Yes | filtered by audience | List announcements |
| POST | `/api/announcements` | Yes | admin | Create announcement |
| PATCH | `/api/announcements/:id` | Yes | admin | Update announcement |
| POST | `/api/announcements/:id/read` | Yes | self | Mark as read |

### System
| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| GET | `/api/system/initialized` | No | — | Check if system is initialized |
| POST | `/api/system/init` | No | — | Initial setup (first user) |
| GET | `/api/system/status` | Yes | Any | Get system status |
| PATCH | `/api/system/status` | Yes | super_user | Update system status |
| GET | `/api/system/modules` | No | — | Get module config |
| PATCH | `/api/system/modules` | Yes | super_user | Update module config |
| GET | `/api/system/activation-history` | Yes | super_user | Get activation log |
| POST | `/api/system/backfill-timeline` | Yes | super_user | Backfill timeline events |

### Positions, Work Areas, Locations
| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| GET | `/api/positions` | Yes | Any | List positions |
| POST | `/api/positions` | Yes | admin | Create position |
| PATCH | `/api/positions/:id` | Yes | admin | Update position |
| DELETE | `/api/positions/:id` | Yes | admin | Delete position |
| GET | `/api/work-areas` | Yes | Any | List work areas |
| POST | `/api/work-areas` | Yes | admin | Create work area |
| PATCH | `/api/work-areas/:id` | Yes | admin | Update work area |
| DELETE | `/api/work-areas/:id` | Yes | admin | Delete work area |
| GET | `/api/locations` | Yes | Any | List locations |
| POST | `/api/locations` | Yes | admin | Create location |
| PATCH | `/api/locations/:id` | Yes | admin | Update location |
| DELETE | `/api/locations/:id` | Yes | admin | Delete location |

### Deploy
| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| POST | `/api/deploy` | Webhook | HMAC signature | Deploy webhook |

### Health
| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| GET | `/api/health` | No | — | Health check |
| GET | `/api/health/stats` | Yes | admin/super_user | Health stats |

