# Digest Design

## Daily Digest (8:00 AM CST)

**Recipients:** All supervisors + admins + socios

**Content:**
- Pending supervisor evaluations count
- Pending feedback sessions count
- Pending action plan approvals count
- Pending vacation approvals count

**Delivery:** Email + In-app notification

**Implementation:** `server/services/notification-scheduler.ts` → `generateDailyDigest()`

**Preference:** Controlled by `notification_preferences.digest_enabled` for category='system'

## Weekly Digest (NOT YET IMPLEMENTED)

**Proposed schedule:** Monday 8:00 AM CST

**Content:**
- Team status summary
- Evaluation completion rates
- Objective status summary
- Action plan status summary
- Vacation balance summary

**Priority:** Low. Daily digest provides immediate value. Weekly is supplementary.

## Volume Estimate

At 14 users (5 supervisors, 2 admins):
- Daily digest: 7 notifications/day (5 supervisors + 2 admins)
- Monthly: ~210 notifications
- Annual: ~2,520 notifications

At 100 users:
- Daily digest: ~25 notifications/day
- Monthly: ~750
- Annual: ~9,000
