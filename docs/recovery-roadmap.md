# SMPS Recovery Roadmap

## P0 — Functionality Broken (Must Fix Immediately)

**NONE.** All core evaluation flows are functional after the fixes applied in this session:
- ✅ Section weights corrected (counsel=100/0/0, socio=50/25/25, salary_partner=50/25/25)
- ✅ Practice area filtering fixed in supervisor evaluations and evaluation viewer
- ✅ NA approval period filter fixed (viewPeriod instead of currentPeriod)
- ✅ User practice_area values corrected (consultoria_fiscal, litigio_fiscal)
- ✅ Seed script section weights corrected

## P1 — Functionality Degraded (Works but Differs from Original)

### P1-1: SMTP Not Configured
**Impact:** New user activation and password reset emails cannot be sent. Legacy security question reset still works.
**Fix:** Configure Hostinger SMTP or alternative email service.
**Effort:** Medium (requires DNS configuration)
**Risk if ignored:** Users cannot self-register or reset passwords via email.

### P1-2: Dashboard Defaults to Current Period (May Be Empty)
**Impact:** When a new period starts with no data, dashboard shows empty state instead of previous period's data.
**Current Mitigation:** Dashboard already has fallback logic to show previous period when current has no data.
**Fix:** Add a prominent banner indicating the period and ability to switch.
**Effort:** Small
**Risk if ignored:** Users think data is lost when period changes.

### P1-3: Historical Evaluation Responses Lack Question Text
**Impact:** When viewing historical evaluations, question text is looked up from current template. If template questions changed, displayed text may differ from what was originally asked.
**Original behavior:** Same — original app also looked up questions from hardcoded templates, not from stored snapshots.
**Fix:** Not needed — this is not a regression. New evaluations DO store question_text.
**Effort:** N/A (not a regression)
**Risk if ignored:** Low (future evaluations have snapshot data)

### P1-4: @tanstack/react-query-devtools Visible in Production
**Impact:** Developer tools visible to users in browser console/network tab.
**Fix:** Remove or make conditional on development mode.
**Effort:** Small
**Risk if ignored:** Low (cosmetic, not functional)

## P2 — Technical Debt (Not User-Visible)

### P2-1: Analytics Tables Need Regular Refresh
**Impact:** Dashboard and reports rely on pre-computed analytics tables that must be refreshed.
**Current State:** Tables are refreshed periodically but may be stale.
**Fix:** Ensure analytics scheduler runs reliably.
**Effort:** Small

### P2-2: Evaluation Response Snapshot Incompleteness
**Impact:** Historical responses have NULL question_text, category, section, weight values.
**Original behavior:** Same — original app didn't store these either.
**Fix:** Not needed for historical data. New evaluations store all fields.
**Effort:** N/A

### P2-3: New Positions Not in Original
**Impact:** Three positions (pasante, soporte, archivista) exist in DB but not in original hardcoded hierarchy.
**Current State:** These positions have template questions and section weights.
**Fix:** Verify these are intentional additions, not errors.
**Effort:** Small (verification only)

### P2-4: Position Label Mismatch for pasante_corporativo
**Impact:** Original label was "Pasante Corporativo", current DB label is "Pasante".
**Fix:** Update position_config label for pasante_corporativo.
**Effort:** Trivial (one SQL UPDATE)

## Summary

| Priority | Issue | Impact | Status |
|----------|-------|--------|--------|
| P0 | (None) | — | ✅ All P0 fixed |
| P1-1 | SMTP not configured | Can't send activation/reset emails | Pending SMTP setup |
| P1-2 | Dashboard period default | Shows empty when new period starts | Mitigated by fallback |
| P1-3 | Historical question text NULL | Not a regression | Not needed |
| P1-4 | DevTools visible | Cosmetic | Low priority |
| P2-1 | Analytics refresh | Reports may be stale | Monitor |
| P2-2 | Response snapshots incomplete | Not a regression | N/A |
| P2-3 | Extra positions | Verify intentional | Small |
| P2-4 | Label mismatch | "Pasante" vs "Pasante Corporativo" | Trivial |

## What Must Be Restored

**Nothing needs to be restored.** The original functionality has been preserved after the fixes applied in this session. The migration from hardcoded to database-driven is functionally complete.

The only remaining gap is SMTP configuration, which is an infrastructure task (not a code regression).
