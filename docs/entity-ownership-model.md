# Entity Ownership Model — SMPS Performance Compass

## Definition of Terms

- **Owner**: The user who created or is primarily responsible for the entity
- **Subject**: The user the entity is about (may differ from owner)
- **Supervisor**: A user assigned to evaluate/manage the subject in a given period

---

## users

| Action | Employee | Supervisor | Socio | Admin | SuperUser |
|--------|----------|------------|-------|-------|-----------|
| Read own profile | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read other profiles | ❌ | Supervisees only | All except socios/MP | All | All |
| Create user | ❌ | ❌ | ❌ | ✅ | ✅ |
| Update own profile | ✅ | ✅ | ✅ | ✅ | ✅ |
| Update other profiles | ❌ | ❌ | ❌ | ✅ | ✅ |
| Update roles | ❌ | ❌ | ❌ | ✅* | ✅** |
| Delete user | ❌ | ❌ | ❌ | ✅ | ✅ |
| Reset password | ❌ | ❌ | ❌ | ✅ | ✅ |

\* Admin cannot modify super_user status.
\** Super_user cannot demote themselves.

**Owner**: Self (each user owns their own profile)
**Visibility**: Based on `canViewUserEvaluations` and assignment relationships

---

## evaluations

| Action | Employee | Supervisor | Socio | Admin | SuperUser |
|--------|----------|------------|-------|-------|-----------|
| Read own evaluation | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read supervisee's evaluation | ❌ | ✅ | ✅ | ✅ | ✅ |
| Read all evaluations | ❌ | ❌ | ✅* | ✅ | ✅ |
| Create self-evaluation | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create supervisor evaluation | ❌ | ✅** | ✅** | ✅ | ✅ |
| Update own draft evaluation | ✅ | ✅ | ✅ | ✅ | ✅ |
| Update supervisee's evaluation | ❌ | ✅** | ✅** | ✅ | ✅ |
| Update any evaluation | ❌ | ❌ | ❌ | ✅ | ✅ |
| Complete feedback | ❌ | ✅** | ✅** | ✅ | ✅ |
| Approve NA | ❌ | ✅** | ✅** | ✅ | ✅ |
| Export CSV | ❌ | ❌ | ✅ | ✅ | ✅ |

\* Socio cannot see other socios' or managing partner's evaluations
\** Only for employees they supervise in the current period

**Owner**: The evaluator (person who wrote it)
**Subject**: The evaluated employee

---

## evaluation_responses

Responses inherit ownership from their parent evaluation.

| Action | Employee | Supervisor | Socio | Admin | SuperUser |
|--------|----------|------------|-------|-------|-----------|
| Read own responses | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read supervisee's responses | ❌ | ✅ | ✅ | ✅ | ✅ |
| Read all responses | ❌ | ❌ | ✅* | ✅ | ✅ |

**Owner**: Inherited from evaluation
**Subject**: Same as evaluation

---

## supervisor_assignments

| Action | Employee | Supervisor | Socio | Admin | SuperUser |
|--------|----------|------------|-------|-------|-----------|
| Read own assignments | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read all assignments | ❌ | ❌ | ✅ | ✅ | ✅ |
| Create assignment | ❌ | ❌ | ❌ | ✅ | ✅ |
| Delete assignment | ❌ | ❌ | ❌ | ✅ | ✅ |

**Owner**: None (system-managed)
**Note**: Assignments define the supervisor-employee relationship for a period

---

## action_plans

| Action | Employee | Supervisor | Socio | Admin | SuperUser |
|--------|----------|------------|-------|-------|-----------|
| Read own plan | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read supervisee's plan | ❌ | ✅ | ✅ | ✅ | ✅ |
| Read all plans | ❌ | ❌ | ❌ | ✅ | ✅ |
| Create plan (as supervisor) | ❌ | ✅** | ✅** | ✅ | ✅ |
| Update own plan | ✅ | ✅** | ✅ | ✅ | ✅ |
| Approve/reject plan | ❌ | ✅** | ❌ | ✅ | ✅ |

\** Only for employees they supervise in the current period

**Owner**: The supervisor (who creates the plan)
**Subject**: The employee (whose plan it is)

---

## objectives (personal_objectives)

| Action | Employee | Supervisor | Socio | Admin | SuperUser |
|--------|----------|------------|-------|-------|-----------|
| Read own objectives | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read all objectives | ❌ | ❌ | ✅ | ✅ | ✅ |
| Create own objectives | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create objectives for others | ❌ | ❌ | ❌ | ✅ | ✅ |
| Submit own objectives | ✅ | ✅ | ✅ | ✅ | ✅ |
| Review/approve objectives | ❌ | ❌ | ❌ | ✅ | ✅ |

**Owner**: The employee (whose objectives they are)

---

## vacation_requests

| Action | Employee | Supervisor | Socio | Admin | SuperUser |
|--------|----------|------------|-------|-------|-----------|
| Read own requests | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read supervisee's requests | ❌ | ✅ | ❌ | ✅ | ✅ |
| Read all requests | ❌ | ❌ | ❌ | ✅ | ✅ |
| Create own request | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create for others | ❌ | ❌ | ❌ | ✅ | ✅ |
| Cancel own request | ✅ | ✅ | ✅ | ✅ | ✅ |
| Update request status | ❌ | ❌ | ❌ | ✅ | ✅ |
| Approve/reject request | ❌ | ✅** | ❌ | ✅ | ✅ |
| View vacation config | ❌ | ❌ | ❌ | ✅ | ✅ |
| Update vacation config | ❌ | ❌ | ❌ | ✅ | ✅ |
| Add extra vacation days | ❌ | ❌ | ❌ | ✅ | ✅ |

\** Only for employees they supervise

**Owner**: The employee (who requested vacation)

---

## announcements

| Action | Employee | Supervisor | Socio | Admin | SuperUser |
|--------|----------|------------|-------|-------|-----------|
| Read (filtered by audience) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create | ❌ | ❌ | ❌ | ✅ | ✅ |
| Update | ❌ | ❌ | ❌ | ✅ | ✅ |
| Archive | ❌ | ❌ | ❌ | ✅ | ✅ |
| Mark as read | ✅ | ✅ | ✅ | ✅ | ✅ |

**Owner**: The author (admin who created it)
**Visibility**: Based on `audience` field (all, legal, administrativo)

---

## periods (period_configs)

| Action | Employee | Supervisor | Socio | Admin | SuperUser |
|--------|----------|------------|-------|-------|-----------|
| Read | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create/update | ❌ | ❌ | ❌ | ✅ | ✅ |

**Owner**: System (admin-managed)

---

## reports

| Action | Employee | Supervisor | Socio | Admin | SuperUser |
|--------|----------|------------|-------|-------|-----------|
| View reports | ❌ | ❌ | ✅ | ✅ | ✅ |
| Score analysis | ❌ | ❌ | ✅ | ✅ | ✅ |
| Export data | ❌ | ❌ | ✅ | ✅ | ✅ |

**Owner**: None (derived data)

---

## copilot_conversations

| Action | Employee | Supervisor | Socio | Admin | SuperUser |
|--------|----------|------------|-------|-------|-----------|
| Access copilot | ❌ | ❌ | ❌ | ❌ | ✅ |
| Create conversation | ❌ | ❌ | ❌ | ❌ | ✅ |
| View own conversations | ❌ | ❌ | ❌ | ❌ | ✅ |
| Delete conversations | ❌ | ❌ | ❌ | ❌ | ✅ |
| Configure copilot | ❌ | ❌ | ❌ | ❌ | ✅ |

**Owner**: The super_user who created the conversation

---

## evaluation_config (categories, weights, templates, questions, positions)

| Action | Employee | Supervisor | Socio | Admin | SuperUser |
|--------|----------|------------|-------|-------|-----------|
| Read | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create/update/delete | ❌ | ❌ | ❌ | ✅ | ✅ |
| Reseed | ❌ | ❌ | ❌ | ✅ | ✅ |

**Owner**: System (admin-managed)
