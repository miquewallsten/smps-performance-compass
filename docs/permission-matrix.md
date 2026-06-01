# Permission Matrix — SMPS Performance Compass

## Role Definitions

| Role | Key | Description |
|------|-----|-------------|
| SuperUser | `super_user` | Full system access, copilot, system config |
| Admin | `admin` | User management, evaluation config, all modules |
| Managing Partner | `managing_partner` | Socio Administrador — sees all users, all evaluations |
| Socio | `socio` | Regular partner — sees all except other socios and managing partner |
| Employee | `employee` | Regular user — sees own data + supervised team |

## Matrix

### Users Module

| Action | super_user | admin | managing_partner | socio | employee |
|--------|:----------:|:-----:|:---------------:|:-----:|:--------:|
| Read all users | ✅ | ✅ | ✅ | ✅* | ❌ |
| Read own profile | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read supervised users | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create user | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update user | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update own profile | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete user | ✅ | ✅ | ❌ | ❌ | ❌ |
| Reset password | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update roles | ✅ | ✅* | ❌ | ❌ | ❌ |

\* Socio sees all users except other socios and managing partner.
\* Admin cannot modify super_user status; only super_user can.

### Evaluations Module

| Action | super_user | admin | managing_partner | socio | employee |
|--------|:----------:|:-----:|:---------------:|:-----:|:--------:|
| Read own evaluations | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read evaluations of supervised users | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read all evaluations | ✅ | ✅ | ✅ | ✅ | ❌ |
| Export CSV | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create self-evaluation | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create supervisor evaluation | ✅ | ✅ | ✅ | ✅ | ✅* |
| Update own evaluation | ✅ | ✅ | ✅ | ✅ | ✅ |
| Update supervised evaluation | ✅ | ✅ | ✅ | ✅ | ✅* |
| Complete feedback | ✅ | ✅ | ✅ | ✅ | ✅* |
| Approve NA | ✅ | ✅ | ✅ | ✅ | ✅* |

\* Only for users they supervise in the current period.

### Objectives Module

| Action | super_user | admin | managing_partner | socio | employee |
|--------|:----------:|:-----:|:---------------:|:-----:|:--------:|
| Read own objectives | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read all objectives | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create own objectives | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create objectives for others | ✅ | ✅ | ❌ | ❌ | ❌ |
| Submit own objectives | ✅ | ✅ | ✅ | ✅ | ✅ |
| Review/approve objectives | ✅ | ✅ | ❌ | ❌ | ❌ |

### Action Plans Module

| Action | super_user | admin | managing_partner | socio | employee |
|--------|:----------:|:-----:|:---------------:|:-----:|:--------:|
| Read own action plan | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read supervised action plans | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read all action plans | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create action plan (as supervisor) | ✅ | ✅ | ✅ | ✅ | ✅* |
| Update own action plan | ✅ | ✅ | ✅ | ✅ | ✅ |
| Approve action plan | ✅ | ✅ | ✅ | ✅ | ✅* |

\* Only for users they supervise.

### Vacations Module

| Action | super_user | admin | managing_partner | socio | employee |
|--------|:----------:|:-----:|:---------------:|:-----:|:--------:|
| Read own requests | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read supervised requests | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read all requests | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create own request | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create request for others | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update own request (cancel) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Update any request status | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve supervised requests | ✅ | ✅ | ✅ | ✅ | ✅* |
| Approve any request | ✅ | ✅ | ❌ | ❌ | ❌ |
| Read config | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update config | ✅ | ✅ | ❌ | ❌ | ❌ |
| Add extra days | ✅ | ✅ | ❌ | ❌ | ❌ |

\* Only for users they supervise.

### Announcements Module

| Action | super_user | admin | managing_partner | socio | employee |
|--------|:----------:|:-----:|:---------------:|:-----:|:--------:|
| Read (filtered by audience) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update | ✅ | ✅ | ❌ | ❌ | ❌ |
| Archive | ✅ | ✅ | ❌ | ❌ | ❌ |
| Mark as read | ✅ | ✅ | ✅ | ✅ | ✅ |

### Reports Module

| Action | super_user | admin | managing_partner | socio | employee |
|--------|:----------:|:-----:|:---------------:|:-----:|:--------:|
| Read reports | ✅ | ✅ | ✅ | ✅ | ❌ |
| Score analysis | ✅ | ✅ | ✅ | ✅ | ❌ |
| Export data | ✅ | ✅ | ✅ | ✅ | ❌ |

### Copilot Module

| Action | super_user | admin | managing_partner | socio | employee |
|--------|:----------:|:-----:|:---------------:|:-----:|:--------:|
| Access copilot | ✅ | ❌ | ❌ | ❌ | ❌ |
| Configure copilot | ✅ | ❌ | ❌ | ❌ | ❌ |

### System Configuration

| Action | super_user | admin | managing_partner | socio | employee |
|--------|:----------:|:-----:|:---------------:|:-----:|:--------:|
| Read system status | ✅ | ✅ | ❌ | ❌ | ❌ |
| Toggle system status | ✅ | ❌ | ❌ | ❌ | ❌ |
| Read modules config | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update modules config | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage periods | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage positions/areas/locations | ✅ | ✅ | ❌ | ❌ | ❌ |
| Access control | ✅ | ❌ | ❌ | ❌ | ❌ |

### Supervisor Assignments

| Action | super_user | admin | managing_partner | socio | employee |
|--------|:----------:|:-----:|:---------------:|:-----:|:--------:|
| Read own assignments | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read all assignments | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create assignment | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete assignment | ✅ | ✅ | ❌ | ❌ | ❌ |

### Timeline

| Action | super_user | admin | managing_partner | socio | employee |
|--------|:----------:|:-----:|:---------------:|:-----:|:--------:|
| Read own timeline | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read any timeline | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create event | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update event | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete event | ✅ | ✅ | ❌ | ❌ | ❌ |
