# Notification Audit Design

## Audit Trail

Every notification records:

| Field | Source | Purpose |
|---|---|---|
| notification.id | Generated | Unique identifier |
| notification.recipient_id | Route/scheduler | Who received it |
| notification.type | Event classification | Info/reminder/warning/approval/escalation |
| notification.category | Business category | evaluation/objective/vacation/etc |
| notification.created_at | System | When generated |
| notification.is_read | User action | When user viewed it |
| notification.read_at | User action | When viewed |

## Delivery Tracking

| Field | Source | Purpose |
|---|---|---|
| delivery.channel | System | in_app or email |
| delivery.status | System | pending/sent/failed/bounced |
| delivery.attempted_at | System | When delivery was attempted |
| delivery.delivered_at | System | When confirmed delivered |
| delivery.error_message | System | Failure reason if any |

## Notification Effectiveness Report (Future)

Query to measure notification → action conversion:

```sql
SELECT 
  n.category,
  n.type,
  COUNT(*) as sent_count,
  SUM(n.is_read) as read_count,
  ROUND(SUM(n.is_read) / COUNT(*) * 100, 1) as read_rate,
  SUM(CASE WHEN n.read_at IS NOT NULL 
    AND TIMESTAMPDIFF(MINUTE, n.created_at, n.read_at) < 60 
    THEN 1 ELSE 0 END) as read_within_1hr
FROM notifications n
WHERE n.created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY n.category, n.type
ORDER BY n.category, n.type;
```

## Current Limitations

- No open tracking for emails (no pixel tracking)
- No click tracking for action URLs
- No conversion tracking (notification → evaluation completed)
- These are future enhancements when volume justifies the complexity
