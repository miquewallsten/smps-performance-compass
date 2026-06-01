# Notification Framework

## Architecture

```
Route Handler / Scheduler
        │
        ▼
createNotification(params)
        │
        ├──► Store in `notifications` table
        │
        ├──► Record delivery in `notification_deliveries` (in_app = sent)
        │
        ├──► Check `notification_preferences` for email setting
        │     │
        │     ▼ (if email enabled AND not info-only)
        │   sendTemplateEmail() → nodemailer → sendmail/SMTP
        │     │
        │     ▼ (record delivery result)
        │   notification_deliveries (email = sent/failed)
        │
        └──► Return notification ID

Frontend
        │
        ▼
GET /api/notifications          → list notifications
GET /api/notifications/count    → unread badge
PATCH /notifications/:id/read   → mark read
POST /notifications/read-all    → mark all read
GET /notifications/preferences  → user settings
PATCH /notifications/preferences → update settings
GET /notifications/pending-actions → dashboard widget
```

## Channels

| Channel | Status | Implementation |
|---|---|---|
| In-app | ✅ ACTIVE | Stored in DB, fetched via API |
| Email | ✅ ACTIVE | Via sendmail (Hostinger production) |
| Teams/Slack | ❌ FUTURE | Webhook integration |

## Notification Types

| Type | Emoji | When Used | Email Default |
|---|---|---|---|
| `info` | ℹ️ | Status changes, completions | No |
| `reminder` | ⏰ | Upcoming deadlines (7d, 3d) | Yes |
| `warning` | ⚠️ | Overdue items | Yes |
| `approval_required` | ✅ | Needs user action to approve | Yes |
| `escalation` | 🔴 | Overdue items escalated to admin | Yes |

## Queue Architecture

Current: **Synchronous in-process** (no external queue).

At 14 users, notifications generate in <10ms per event. No queue needed.

**When to add a queue:**
- At 100+ users, consider a simple in-memory queue with retry
- At 1000+ users, consider Redis/BullMQ

## Deduplication

The scheduler checks `lastReminderCheck` to avoid generating duplicate reminders within the same day. Event-driven notifications (from route handlers) are naturally unique since they fire once per action.

## Error Handling

- Email failures: logged to `notification_deliveries` with status='failed'
- In-app delivery: always succeeds (it's a DB insert)
- Notification creation failure: logged, returns null (non-blocking)
- Notification failures never block the originating operation

## Rate Limiting

Email notifications are limited to non-info types by default. Info notifications are in-app only. This reduces email volume significantly.

At 14 users with 5 categories: max ~5-10 emails per day during active periods.
