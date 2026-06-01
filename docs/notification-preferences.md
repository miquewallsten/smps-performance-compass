# Notification Preferences

## User-Configurable Settings

| Setting | Options | Default |
|---|---|---|
| Email notifications | On/Off | On |
| In-app notifications | On/Off | On |
| Reminder frequency | none/daily/3days/weekly | 3days |
| Daily digest | On/Off | On |

**Per category:** evaluation, objective, action_plan, vacation, system

## Admin-Enforced Settings

Admins cannot currently force notification settings on users. Critical notifications (escalations, approval_required) are always delivered regardless of preferences.

## API

| Endpoint | Method | Purpose |
|---|---|---|
| GET /api/notifications/preferences | GET | List user's preferences by category |
| PATCH /api/notifications/preferences | PATCH | Update preference (body: { category, emailEnabled, inAppEnabled, reminderFrequency, digestEnabled }) |

## Future Enhancements

- Admin-enforced critical notifications (cannot be disabled)
- Quiet hours (no email between 8PM-7AM)
- Weekly digest option
- Per-category custom reminder schedules
