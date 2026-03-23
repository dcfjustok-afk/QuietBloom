---
phase: 02-scheduling-engine
plan: 02
subsystem: ui
tags: [react, tauri, vitest, scheduler, quiet-hours, pause-all]
requires:
  - phase: 02-01
    provides: Rust-owned scheduler_state persistence, derived runtime queue, and active-window-aware schedule compilation
provides:
  - Dashboard-top scheduler control strip for quiet hours and pause-all inside the existing shell
  - Typed frontend and Tauri scheduler command boundary for quiet-hours save, pause presets, resume, and scheduler snapshot reads
  - Reminder drawer allowed-hours editing embedded in the existing schedule payload and advanced schedule area
affects: [02-03, scheduling-engine, dashboard-ui, reminder-drawer]
tech-stack:
  added: []
  patterns: [dashboard refetches reminders and scheduler snapshot together, explicit-save quiet-hours editor, allowed-hours preserved inside schedule_json contract]
key-files:
  created:
    - src-tauri/src/commands/scheduler.rs
    - src/features/reminders/api/scheduler.ts
    - src/features/reminders/model/scheduler.ts
    - src/features/reminders/components/SchedulerControlStrip.tsx
  modified:
    - src/app/AppShell.tsx
    - src/features/reminders/components/ReminderDrawer.tsx
    - src/features/reminders/form/reminder-form-schema.ts
    - src/App.css
    - vite.config.ts
key-decisions:
  - "Scheduler snapshot carries quiet-hours, pause-all, and runtime summary copy so the dashboard strip stays thin and typed."
  - "Reminder-level allowed hours stay embedded in the existing schedule payload and are edited only inside the reminder drawer."
  - "App-wide timing state has one primary home in the dashboard strip, with only a lightweight secondary echo in Today overview."
patterns-established:
  - "AppShell refreshes reminder data and scheduler snapshot together after reminder or scheduler mutations to keep shell surfaces synchronized without adding global state."
  - "Quiet-hours editing uses an explicit-save inline panel, while pause-all remains locked to four preset commands and a resume-now action."
requirements-completed: [SCHD-03, SCHD-04]
duration: 15min
completed: 2026-03-23
---

# Phase 2 Plan 2: Scheduler Control Surfaces Summary

**Dashboard-top quiet-hours and pause-all controls plus drawer-level allowed-hours editing are now wired to the native scheduler snapshot boundary without expanding into settings, history, or delivery UI**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-23T02:35:00Z
- **Completed:** 2026-03-23T02:49:57Z
- **Tasks:** 3
- **Files modified:** 19

## Accomplishments
- Added a narrow typed scheduler boundary from Tauri to React for quiet-hours persistence, pause-all presets, early resume, and read-only scheduler snapshot state.
- Inserted a calm dashboard-top scheduler control strip below the existing top bar, with explicit-save quiet-hours editing, four locked pause presets, and one lightweight Today overview echo.
- Extended the existing reminder drawer advanced schedule area with allowed-hours editing, cross-midnight helper copy, and validation that blocks identical boundaries.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the typed scheduler boundary for quiet hours, pause-all, and allowed-window schedules**
   - `d6f838e` test(02-02): 添加调度边界红灯用例
   - `7025d87` feat(02-02): 接入调度边界与允许时段契约
2. **Task 2: Build the dashboard-top scheduler control strip for quiet hours and pause-all**
   - `0fd7c14` test(02-02): 添加调度控制条红灯用例
   - `56639e2` feat(02-02): 添加顶部调度控制条
3. **Task 3: Add reminder-level allowed hours in the drawer and surface next-fire constraints lightly**
   - `3c079fb` test(02-02): 添加抽屉允许时段红灯用例
   - `a3d76a7` feat(02-02): 在抽屉中添加允许时段编辑

Additional verification fix:
- `d975cc7` fix(02-02): 修复全量验证阻塞项

## Files Created/Modified
- `src-tauri/src/commands/scheduler.rs` - Exposes the Phase 2-only native command surface for quiet hours, pause-all presets, resume, and scheduler snapshots.
- `src/features/reminders/model/scheduler.ts` - Defines the typed scheduler snapshot contract and locked pause preset union for React.
- `src/features/reminders/api/scheduler.ts` - Provides typed Tauri invoke wrappers for scheduler reads and mutations.
- `src/app/AppShell.tsx` - Fetches scheduler snapshot state alongside reminders and hosts the new control strip below the top bar.
- `src/features/reminders/components/SchedulerControlStrip.tsx` - Implements the utility-tray UI for quiet-hours editing and pause-all actions.
- `src/features/reminders/components/ReminderDrawer.tsx` - Adds allowed-hours editing inside the existing advanced schedule area.
- `src/features/reminders/form/reminder-form-schema.ts` - Accepts optional reminder-level active windows and blocks identical boundaries.
- `vite.config.ts` - Restores Vitest default excludes so plan-level verification runs only repository tests.

## Decisions Made
- Kept the native command boundary intentionally narrow to the approved Phase 2 timing controls and did not add delivery, history, settings, or occurrence actions.
- Used one shared dashboard strip for app-wide timing policy and kept reminder-specific allowed hours inside the existing drawer rather than duplicating controls across rows or hero cards.
- Preserved allowed-hours data on the shared schedule union so interval and fixed-time reminders continue to travel through one persisted payload.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Restored full-suite verification after the new scheduler shell dependency exposed test-runner drift**
- **Found during:** Plan-level verification after Task 3
- **Issue:** `pnpm vitest run` was traversing dependency tests under `node_modules` because the repository test config replaced Vitest's default exclude set, and existing AppShell-based component tests lacked scheduler API mocks after the new dashboard strip landed.
- **Fix:** Reintroduced Vitest's default excludes through `configDefaults.exclude` and added scheduler API mocks to the affected existing component tests.
- **Files modified:** `vite.config.ts`, `src/features/reminders/components/ReminderRow.test.tsx`, `src/features/reminders/components/NextReminderCard.test.tsx`
- **Verification:** `cargo test --manifest-path /Users/charlie/Charlie-person/QuietBloom/src-tauri/Cargo.toml && cd /Users/charlie/Charlie-person/QuietBloom && pnpm vitest run`
- **Committed in:** `d975cc7`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The fix was necessary to complete the plan's required verification loop. No product scope expanded beyond 02-02.

## Issues Encountered
- Shared terminal working-directory state occasionally caused relative verification commands to run from the wrong folder; rerunning those commands with absolute paths or `--manifest-path` resolved the issue without code changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- 02-03 can build lifecycle recovery and overdue reconciliation on top of the live scheduler snapshot boundary and the existing dashboard strip refresh path.
- Reminder-level allowed-hours editing is already embedded in the drawer and schedule payload, so 02-03 can focus on read-model refresh and reconciliation semantics instead of adding new authoring surfaces.

## Self-Check
PASSED

---
*Phase: 02-scheduling-engine*
*Completed: 2026-03-23*