# Notification Schema

## Tables

### notifications
| Column | Type | Purpose |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| recipient_id | VARCHAR(36) | FK to users.id |
| type | ENUM | info/reminder/warning/approval_required/escalation |
| category | VARCHAR(50) | evaluation/objective/action_plan/vacation/system |
| title | VARCHAR(255) | Short display text |
| body | TEXT | Longer description |
| action_url | VARCHAR(500) | Deep link |
| related_entity_id | VARCHAR(36) | Entity that triggered this |
| related_entity_type | VARCHAR(50) | Entity type |
| is_read | TINYINT(1) | Read status |
| read_at | DATETIME | When read |
| is_email_sent | TINYINT(1) | Whether email was sent |
| email_sent_at | DATETIME | When email was sent |
| is_email_enabled | TINYINT(1) | User preference |
| created_at | DATETIME | Creation time |
| expires_at | DATETIME | Stale date |

**Indexes:** recipient_id, (recipient_id, is_read), category, type, created_at, expires_at, (related_entity_type, related_entity_id)

### notification_preferences
| Column | Type | Purpose |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| user_id | VARCHAR(36) | FK to users.id |
| category | VARCHAR(50) | Notification category |
| email_enabled | TINYINT(1) | Email on/off |
| in_app_enabled | TINYINT(1) | In-app on/off |
| reminder_frequency | ENUM | none/daily/3days/weekly |
| digest_enabled | TINYINT(1) | Daily digest on/off |

**Unique:** (user_id, category)

### notification_deliveries
| Column | Type | Purpose |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| notification_id | VARCHAR(36) | FK to notifications.id |
| channel | ENUM | in_app/email |
| status | ENUM | pending/sent/failed/bounced |
| attempted_at | DATETIME | When attempted |
| delivered_at | DATETIME | When delivered |
| error_message | TEXT | Error details |

**Indexes:** notification_id, status
