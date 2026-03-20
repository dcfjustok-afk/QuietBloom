---
phase: 01-reminder-foundation
plan: 04
subsystem: scheduling
tags: [react, typescript, rust, chrono, vitest, cargo-test]
requires:
  - phase: 01-01
    provides: Persisted reminder repository and native command boundary
  - phase: 01-02
    provides: Shared schedule contracts and typed Tauri wrappers
  - phase: 01-03
    provides: Dashboard shell and right-side drawer workflow
provides:
  - Authoritative Rust next-due computation for interval and fixed-time schedules
  - Preset-first schedule editor with progressive advanced controls
  - Dashboard read model that surfaces persisted next-due text across hero and rows
affects: [phase-02, scheduling-engine, notification-delivery, dashboard-ui]
tech-stack:
  added: []
  patterns: [rust-owned next-due authority, preset-first schedule authoring, presentation-only next-due formatting]
key-files:
  created:
    - src/features/reminders/components/NextReminderCard.test.tsx
  modified:
    - src-tauri/src/domain/schedule.rs
    - src/App.css
    - src/app/AppShell.tsx
    - src/features/reminders/components/NextReminderCard.tsx
    - src/features/reminders/components/ReminderDrawer.tsx
    - src/features/reminders/components/ReminderDrawer.test.tsx
    - src/features/reminders/components/ReminderListSection.tsx
    - src/features/reminders/components/ReminderRow.tsx
    - src/features/reminders/form/reminder-form-schema.ts
    - src/features/reminders/form/reminder-form-schema.test.ts
    - src/features/reminders/model/reminder.ts
    - src/features/reminders/utils/reminder-display.ts
key-decisions:
  - "Rust remains the sole authority for next_due_at so interval and fixed_time scheduling never drift from UI formatting code."
  - "Schedule authoring stays preset-first, with advanced controls hidden until the user explicitly chooses a custom path."
  - "The hero card only considers enabled reminders with a persisted nextDueAt value, while rows show a neutral fallback when no future time exists."
patterns-established:
  - "Frontend schedule presets are expressed in the shared schema layer and written through one drawer component."
  - "Dashboard text uses date-fns only to format persisted timestamps; it does not recompute reminder timing rules."
requirements-completed: [SCHD-01, SCHD-02, REMD-03]
duration: 44min
completed: 2026-03-20
---

# Phase 1: Reminder Foundation Summary

**QuietBloom now supports full Phase 1 schedule authoring and trustworthy next-due presentation on top of Rust-owned persistence**

## Performance

- **Duration:** 44 min
- **Started:** 2026-03-20T07:18:24Z
- **Completed:** 2026-03-20T08:02:26Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments
- Implemented deterministic Rust next-due computation for both interval and fixed-time schedules, including same-day rollover and future weekday selection.
- Replaced the drawer placeholder timing block with a preset-first schedule editor that supports custom interval and custom fixed-time paths through progressive disclosure.
- Updated the dashboard hero and reminder rows to show persisted schedule summaries and next-due text without duplicating scheduler logic in React.
- Added schedule-focused tests across Rust and Vitest, then revalidated the full app build.

## Task Commits

Each separable part of the plan was committed atomically where the file boundaries allowed it:

1. **Task 1: Implement authoritative Rust next-due computation** - ff49ab6
2. **Tasks 2-3: Ship preset-first editor and persisted next-due presentation** - 079e4f1

## Files Created/Modified
- src-tauri/src/domain/schedule.rs - authoritative interval and fixed-time next-due computation plus deterministic tests.
- src/features/reminders/form/reminder-form-schema.ts - exports schedule presets and custom schedule helpers for the drawer.
- src/features/reminders/form/reminder-form-schema.test.ts - validates presets and custom advanced payloads against the discriminated schedule union.
- src/features/reminders/components/ReminderDrawer.tsx - adds schedule mode switching, presets, advanced controls, and live schedule preview.
- src/features/reminders/components/ReminderDrawer.test.tsx - covers fixed-time preset creation, custom interval submission, and dashboard refresh after schedule edits.
- src/features/reminders/components/NextReminderCard.tsx - shows schedule summary and next-due content for the selected next reminder.
- src/features/reminders/components/NextReminderCard.test.tsx - verifies hero rendering and earliest-next-due selection.
- src/features/reminders/utils/reminder-display.ts - formats persisted nextDueAt values and row fallback states without recomputing schedule logic.

## Decisions Made
- The frontend weekday contract remains ISO-style 1 through 7 values because it already aligns with the persisted Rust transport and existing summary formatting.
- Custom interval editing exposes hour and minute controls rather than a single opaque minutes field, which keeps the advanced path legible without expanding scope.
- Reminders with no future time stay visible in rows as `No upcoming time` so the UI never hides disabled or unschedulable state.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Clarification] Replaced time-input typing in tests with direct change events**
- **Found during:** Vitest verification for the custom interval flow
- **Issue:** userEvent typing against native `time` inputs produced partial values that made the saved anchor minute drift from the intended test payload.
- **Fix:** Switched the affected test to explicit change events for numeric and time inputs.
- **Files modified:** src/features/reminders/components/ReminderDrawer.test.tsx
- **Verification:** pnpm vitest run src/features/reminders/components/ReminderDrawer.test.tsx src/features/reminders/components/NextReminderCard.test.tsx src/features/reminders/components/ReminderRow.test.tsx
- **Committed in:** 079e4f1

---

**Total deviations:** 1 auto-fixed (1 native-input test harness clarification)
**Impact on plan:** No scope change. The fix only made the intended schedule-editor test deterministic.

## Issues Encountered
- Native `time` inputs in jsdom needed direct change events for deterministic value updates during testing.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 2 can build quiet hours, pause-all, and recovery rules on top of a stable next-due authority instead of inventing a new schedule core.
- Native delivery work now has reliable persisted next-due data to consume when notifications and action handling are introduced.

---
*Phase: 01-reminder-foundation*
*Completed: 2026-03-20*