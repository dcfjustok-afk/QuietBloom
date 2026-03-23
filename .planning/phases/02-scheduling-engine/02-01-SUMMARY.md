---
phase: 02-scheduling-engine
plan: 01
subsystem: scheduling
tags: [rust, tauri, sqlite, chrono, scheduler, runtime]
requires:
  - phase: 01-04
    provides: Rust-owned next-due computation and the persisted reminder schedule_json boundary
provides:
  - Reminder-level active-window-aware schedule compilation with separate base and effective due decisions
  - Singleton scheduler_state persistence for quiet hours, pause-until, and reconciliation markers
  - Rebuildable native due-queue runtime wired through Tauri app state and reminder mutations
affects: [02-02, 02-03, scheduling-engine, native-delivery]
tech-stack:
  added: []
  patterns: [scheduler-state singleton repository, explicit reminder refresh path, derived in-memory due queue]
key-files:
  created:
    - src-tauri/src/domain/scheduler.rs
    - src-tauri/src/persistence/scheduler_state.rs
    - src-tauri/src/runtime/mod.rs
    - src-tauri/src/runtime/scheduler.rs
  modified:
    - src-tauri/src/domain/mod.rs
    - src-tauri/src/domain/reminder.rs
    - src-tauri/src/domain/schedule.rs
    - src-tauri/src/commands/reminders.rs
    - src-tauri/src/lib.rs
    - src-tauri/src/persistence/mod.rs
    - src-tauri/src/persistence/reminders.rs
key-decisions:
  - "Reminder-level active windows stay inside schedule_json so native timing authority remains on one persisted payload."
  - "App-wide quiet hours and pause state live in one scheduler_state row instead of drifting into frontend or per-reminder storage."
  - "The scheduler runtime is a derived due-queue cache rebuilt from persisted repositories rather than per-reminder timers or delivery logic."
patterns-established:
  - "ReminderRepository.list() is now read-only; scheduler recomputation happens only through explicit refresh paths or write operations."
  - "SchedulerRuntime rebuilds from ReminderRepository plus SchedulerStateRepository and is invalidated through existing Tauri reminder commands."
requirements-completed: [SCHD-03, SCHD-04, DELV-04]
duration: 12min
completed: 2026-03-23
---

# Phase 2 Plan 1: Scheduler Foundation Summary

**Rust-native schedule compilation, scheduler-state persistence, and a rebuildable due queue now form the scheduling foundation for QuietBloom Phase 2**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-23T10:22:24+08:00
- **Completed:** 2026-03-23T10:34:48+08:00
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- Extended the schedule domain so reminders can carry active windows, compute base recurrence separately from effective due time, and classify runtime scheduler state without introducing delivery or history semantics.
- Added a singleton scheduler_state repository plus reminder-side runtime metadata persistence, and removed hidden scheduler reconciliation from reminder list reads.
- Introduced a managed scheduler runtime that rebuilds an ordered due queue from persisted reminders and scheduler_state, then wired reminder save/delete/enable mutations and app startup into the same rebuild seam.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend the native schedule compiler for active-window-aware next-due decisions**
   - `b538623` test(02-01): 添加活动窗口调度红灯用例
   - `55db617` feat(02-01): 实现活动窗口感知的原生调度编译器
2. **Task 2: Persist scheduler_state and remove list-time scheduler side effects**
   - `0873ee6` test(02-01): 添加调度状态仓储红灯用例
   - `5d2b371` feat(02-01): 持久化调度状态并移除列表副作用
3. **Task 3: Introduce a rebuildable due-queue runtime and wire reminder mutations into invalidation**
   - `9aff7b3` test(02-01): 添加调度运行时红灯用例
   - `3e4f3b4` feat(02-01): 接入可重建的调度运行时

Additional cleanup:
- `5f38db0` refactor(02-01): 清理预留接口编译告警

## Files Created/Modified
- `src-tauri/src/domain/scheduler.rs` - Defines local time windows, effective due decisions, runtime status classification, and the new scheduler_state contract.
- `src-tauri/src/domain/schedule.rs` - Splits base recurrence from effective due calculation and adds active-window-aware next-due compilation.
- `src-tauri/src/domain/reminder.rs` - Extends the reminder read model with scheduler-facing runtime metadata.
- `src-tauri/src/persistence/scheduler_state.rs` - Persists the singleton quiet-hours, pause-until, and reconciliation marker row.
- `src-tauri/src/persistence/reminders.rs` - Adds scheduler runtime metadata columns, explicit refresh paths, and list-without-side-effects behavior.
- `src-tauri/src/runtime/scheduler.rs` - Owns the derived in-memory due queue, invalidation counter, and repository-backed rebuild entrypoints.
- `src-tauri/src/commands/reminders.rs` - Triggers scheduler runtime invalidation and rebuild after reminder mutations.
- `src-tauri/src/lib.rs` - Manages one SchedulerRuntime instance and seeds the first rebuild during app setup.

## Decisions Made
- Kept `schedule_json` as the only persisted reminder timing payload by nesting active windows into the existing schedule union instead of creating a separate reminder-window table.
- Stored reminder runtime metadata as `base_due_at` plus `runtime_status` on reminder rows so later plans can distinguish deferred, paused, and catch-up scheduling states without adding history records.
- Let the runtime rebuild eagerly on startup and after CRUD mutations, but stopped short of adding any notification delivery, history emission, snooze, skip, complete, or settings-page behavior.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- One intermediate patch corrupted `src-tauri/src/persistence/reminders.rs`; the file was reconstructed immediately and revalidated before continuing. No scope or behavior changes resulted from that tooling issue.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 02-02 can add quiet-hours and pause-all control surfaces on top of an existing native scheduler_state boundary instead of inventing new persistence seams.
- Phase 02-03 can build lifecycle reconciliation and catch-up policy on top of the persisted `last_reconciled_at`, `base_due_at`, `runtime_status`, and rebuildable runtime queue.

## Self-Check
PASSED

---
*Phase: 02-scheduling-engine*
*Completed: 2026-03-23*
