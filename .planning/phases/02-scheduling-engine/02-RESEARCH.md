# Phase 2: Scheduling Engine - Research

**Researched:** 2026-03-20
**Domain:** Rust-owned scheduling runtime, suppression rules, and lifecycle recovery for QuietBloom
**Confidence:** MEDIUM-HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Quiet Hours And Active Window Model
- Phase 2 should implement both a global app-level quiet hours rule and reminder-level active windows
- Global quiet hours and reminder-level active windows both apply; a reminder may fire only when both rules are satisfied
- Quiet-hour boundaries should be interpreted in the user's local wall-clock timezone, including cross-midnight windows such as 22:00 to 08:00
- If a reminder would become due during quiet hours, it should be deferred to the nearest allowed time after quiet hours end rather than skipped or replayed immediately in a burst

### Pause-All Semantics
- Pause-all should ship with preset durations of 30 minutes, 1 hour, 2 hours, and the rest of today
- While pause-all is active, due reminders should not accumulate for replay
- When pause-all ends, the scheduler should recompute the next valid occurrence from the underlying reminder rules rather than catching up every missed due time

### Recovery And Catch-Up Policy
- Short interruptions and downtime should use a 2-hour threshold
- For short gaps after relaunch, sleep, or wake, overdue reminders should collapse into a single catch-up occurrence instead of replaying every missed reminder
- For long gaps beyond 2 hours, the app should not replay historical due items; it should recompute fresh next-due values from current time
- Recovery policy should remain scheduler-level behavior only in Phase 2; it should not force notification or history delivery semantics that belong to later phases

### Phase 2 Control Surfaces
- The first Phase 2 controls should appear in a lightweight dashboard-top control area rather than a dedicated settings page
- Reminder-specific active windows should be edited inside the existing reminder drawer's advanced schedule area
- Phase 2 should preserve the current dashboard-first shell and avoid introducing a standalone settings surface prematurely

### Claude's Discretion
- Exact naming of quiet hours versus active window labels if the semantics stay intact
- Whether the dashboard control area appears as pills, compact cards, or segmented utility controls
- Internal runtime composition for scheduler worker, queue storage, and lifecycle hooks
- Exact error copy and inline helper text for schedule conflicts or paused-state messaging

### Deferred Ideas (OUT OF SCOPE)
- Native desktop notifications, permission recovery, and user-visible delivery health — Phase 3
- Snooze, skip, complete, dismiss, and occurrence-level action semantics — Phase 3
- Reminder history, missed-event review, and daily retrospection — Phase 4
- Full settings page, launch-at-login, and richer app preferences — Phase 4 unless planning proves a smaller prerequisite is unavoidable
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCHD-03 | User can define an active window or quiet-hours rule so reminders only fire during intended parts of the day | Extend the schedule union with an optional reminder-level active window, add a singleton persisted quiet-hours record, and compute an effective next due that respects both rules in local wall-clock time |
| SCHD-04 | User can temporarily pause all reminders for a preset duration and have them resume automatically | Persist `pause_until` at app scope, expose preset commands from Tauri, and make the runtime recompute from resume time without replaying missed occurrences |
| DELV-04 | User can trust reminders to recover sensibly after app relaunch, sleep or wake, or short downtime | Add a Rust reconciliation path with a locked 2-hour threshold, persist scheduler metadata needed to detect gaps, and surface at most one pending catch-up occurrence per reminder |
</phase_requirements>

## Summary

Phase 2 should evolve the current Phase 1 architecture instead of replacing it. Today the app already has the right foundation: [src-tauri/src/domain/schedule.rs](src-tauri/src/domain/schedule.rs) is the authority for next-due computation, [src-tauri/src/persistence/reminders.rs](src-tauri/src/persistence/reminders.rs) persists `schedule_json` plus `next_due_at`, [src-tauri/src/lib.rs](src-tauri/src/lib.rs) is still a small composition root, and the React shell in [src/app/AppShell.tsx](src/app/AppShell.tsx) already owns the dashboard frame that Phase 2 needs to extend. The correct research conclusion is therefore not “add a second scheduling system.” It is “generalize the existing schedule compiler, add one app-level state record, and introduce a rebuildable runtime queue behind the existing persistence boundary.”

The most stable data-model change is to keep reminder-level timing rules inside the existing `schedule_json` payload and move app-wide timing rules into one SQL-backed singleton table. Reminder-level active windows belong with the reminder definition because they travel with the reminder drawer and need to survive edits just like interval/fixed-time rules. Global quiet hours and pause-all do not belong in each reminder row; they belong in a single scheduler-state record because they are shared runtime policy. This avoids a split-brain design where reminder intent lives in SQLite but runtime policy lives in Store or frontend local state.

The biggest planning trap is to let Phase 2 turn into Phase 3 delivery semantics or Phase 4 settings/history. A due queue is justified here because the roadmap already expects a runtime that stays coherent across relaunch and sleep/wake, but that queue should remain a derived cache over persisted reminder state, not a notification engine, event history, or diagnostics ledger. Recovery should only decide the next actionable occurrence. It should not create occurrence history, notification attempts, or replay batches. That boundary is what keeps the phase implementable in three plans.

**Primary recommendation:** Keep timing authority in Rust, extend `schedule_json` with an optional reminder-level `activeWindow`, add a singleton SQL `scheduler_state` record for quiet hours and pause-all, and introduce a small Rust runtime that maintains a derived due queue plus a pure reconciliation path for startup and wake recovery.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tauri | 2.x existing | Native shell, managed state, command boundary, and lightweight event invalidation | Already present, and official docs explicitly support app-managed state and Rust-to-frontend invalidation for small payloads |
| tauri-plugin-sql | 2.3.2 existing | SQLite-backed reminder and scheduler-state persistence | Already installed and keeps all timing authority in the native layer |
| rusqlite | 0.32.1 existing | Repository layer and migration-friendly persistence | Already present and sufficient for a singleton scheduler-state row plus reminder updates |
| chrono | 0.4.44 existing | Local wall-clock calculations, UTC persistence, and cross-midnight rule evaluation | Already present and already used by the current schedule compiler |
| tokio | 1.50.0 recommended | Sleep-based due queue worker and watch-style invalidation channel | Official docs cover `time::sleep` and `sync::watch`; Phase 2 needs both for a rebuildable runtime loop |
| React | 19.1.0 existing | Dashboard shell and drawer extensions | Already present; Phase 2 adds controls to the existing shell rather than introducing routing or a settings area |
| @tauri-apps/api | 2.x existing | Commands plus event listening for small invalidation messages | Already installed; the event API is sufficient for “refresh now” signals without streaming queue internals |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 4.1.0 existing | Component and form regression coverage for new scheduler controls | Use for dashboard strip, drawer allowed-hours, and pause/quiet rendering behavior |
| Testing Library | existing | Interaction testing for popovers, preset menus, and drawer validation | Use for user-facing flows only; keep scheduler math in Rust tests |
| No new frontend state library | n/a | Keep Phase 2 state local to `AppShell` and feature hooks | Current shell complexity still does not justify Zustand/Redux |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SQL singleton row for quiet hours and pause-all | Tauri Store plugin | Store is fine for preferences, but it would split runtime policy away from reminder reconciliation and add new capability/perms churn for little gain in this phase |
| `schedule_json` extension for active windows | Separate `reminder_windows` table | More normalized, but adds migrations and joins before the product needs them |
| Rust due queue with watch invalidation | React polling or JS timers | Violates the project’s Rust-owned timing boundary and reintroduces the exact sleep/wake drift problem Phase 2 exists to solve |
| Small invalidation event plus refetch | Streaming full queue state over Tauri events | Official docs warn events are for small payloads, not high-throughput streaming data |

**Installation:**

```bash
cargo add tokio --features time,sync
```

**No npm dependency additions are required for Phase 2.**

## Architecture Patterns

### Recommended Project Structure

```text
src/
├── app/
│   └── AppShell.tsx                  # hosts the scheduler control strip and reminder refresh loop
├── features/
│   └── reminders/
│       ├── api/
│       │   ├── reminders.ts          # extend existing reminder DTOs with activeWindow
│       │   └── scheduler.ts          # new quiet-hours, pause-all, and snapshot commands
│       ├── components/
│       │   ├── SchedulerControlStrip.tsx
│       │   ├── QuietHoursTile.tsx
│       │   ├── PauseAllTile.tsx
│       │   └── ReminderDrawer.tsx    # extend advanced schedule area with allowed hours
│       ├── model/
│       │   ├── reminder.ts           # add TimeWindow and runtime status DTOs
│       │   └── scheduler.ts          # app-level snapshot types
│       └── utils/
│           └── reminder-display.ts   # derive runtime labels only, never next-due math

src-tauri/src/
├── commands/
│   ├── reminders.rs                  # existing CRUD plus activeWindow-aware save payloads
│   └── scheduler.rs                  # quiet-hours, pause-all, runtime snapshot commands
├── domain/
│   ├── reminder.rs                   # extends read model with nextDueKind/runtime state fields
│   ├── schedule.rs                   # base recurrence + active-window eligibility helpers
│   └── scheduler.rs                  # quiet hours, pause-all, reconcile policy, queue entry models
├── persistence/
│   ├── reminders.rs                  # add scheduler-aware update methods
│   └── scheduler_state.rs            # singleton quiet-hours/pause metadata repository
├── runtime/
│   ├── scheduler.rs                  # due queue worker
│   └── lifecycle.rs                  # startup and resume reconciliation entrypoints
└── lib.rs                            # manage runtime state, wire commands, spawn worker in setup
```

This is the minimum architectural expansion that fits the existing code. It avoids new cross-feature abstractions, keeps all scheduling logic native-side, and isolates the only new long-lived concept, the runtime scheduler, behind a new `runtime/` module instead of bloating repositories or commands.

### Pattern 1: Extend the Existing Schedule Union Instead of Forking It

**What:** Keep `interval` and `fixed_time` as the two base schedule kinds and add the reminder-level active window as an optional nested field on each variant.

**When to use:** In 02-01 and 02-02, whenever [src-tauri/src/domain/schedule.rs](src-tauri/src/domain/schedule.rs) and the shared TypeScript schedule types evolve.

**Recommended shape:**

```rust
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TimeWindow {
    pub start_minute_of_day: u16,
    pub end_minute_of_day: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct IntervalSchedule {
    pub every_minutes: u32,
    pub anchor_minute_of_day: u32,
    pub active_window: Option<TimeWindow>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FixedTimeSchedule {
    pub weekdays: Vec<u8>,
    pub times: Vec<String>,
    pub active_window: Option<TimeWindow>,
}
```

**Why this is the right evolution path:**
- It preserves the existing `schedule_json` migration path from Phase 1.
- It keeps the reminder drawer editing one payload instead of coordinating multiple tables.
- It lets `schedule.rs` evaluate both “base recurrence” and “allowed window” in one place.

**Do not do this instead:** create a separate reminder-window table in Phase 2. That buys normalization early and costs planner complexity immediately.

### Pattern 2: Put Global Quiet Hours and Pause-All in One Singleton Scheduler State Record

**What:** Persist one SQL row for app-wide timing policy and lightweight runtime metadata.

**When to use:** Immediately in 02-01. The planner should not split quiet hours into Store while pause state lives in SQLite.

**Recommended SQL shape:**

```sql
CREATE TABLE scheduler_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  quiet_hours_enabled INTEGER NOT NULL DEFAULT 0,
  quiet_hours_start_minute INTEGER,
  quiet_hours_end_minute INTEGER,
  pause_until_utc TEXT,
  last_reconciled_at_utc TEXT,
  updated_at_utc TEXT NOT NULL
);
```

**Semantics:**
- `quiet_hours_*` are local wall-clock minute-of-day values, not UTC timestamps.
- `pause_until_utc` is persisted in UTC because pause-all is a temporary absolute deadline.
- `last_reconciled_at_utc` is the durable marker used to classify short versus long gaps.

**Why SQL instead of Store:**
- Reminder recovery already reads and writes SQLite.
- Keeping the policy record in the same persistence layer makes reconciliation testable in Rust without bridging two storage systems.
- It avoids introducing new capability entries for the store plugin in this phase.

### Pattern 3: Treat the Due Queue as a Derived Runtime Cache

**What:** Build an in-memory due queue ordered by effective next-due time, but persist the authoritative next-due fields back to SQLite.

**When to use:** In 02-01 once the base schedule compiler can produce an effective due time under quiet-hours and active-window constraints.

**Recommended runtime composition:**
- `SchedulerRuntime` is managed in Tauri state via `app.manage(...)`.
- The worker owns an ordered queue of `{ reminder_id, due_at, next_due_kind }`.
- Commands that mutate reminders or scheduler settings persist first, then notify the worker through a `tokio::sync::watch` channel.
- The worker sleeps until the earliest due item or a config-change notification, then rebuilds or patches the queue.

**Why `watch` is a fit:** Tokio documents `watch` as a channel for broadcasting the latest config-like value to multiple consumers. That matches “scheduler inputs changed; re-read latest state” far better than ad hoc event handling.

**Do not do this instead:** keep one timer per reminder in Rust or in React. The queue must stay rebuildable from persisted state.

### Pattern 4: Make Recovery a Pure Reconciliation Step With a Persisted Catch-Up Marker

**What:** Recovery should be a deterministic function from persisted reminder state, persisted scheduler metadata, and `now`.

**When to use:** On app startup, on macOS wake notifications if wired in 02-03, and in tests that simulate time gaps.

**Recommended model change:** add one persisted marker on the reminder read model:

```rust
pub enum NextDueKind {
    Normal,
    CatchUp,
}
```

This can be stored as a small text column such as `next_due_kind TEXT NOT NULL DEFAULT 'normal'`.

**Why it matters:** the Phase 2 UI spec wants a “Catch-up next” state, and `next_due_at` alone cannot distinguish a normal upcoming occurrence from a reconciled catch-up occurrence.

**Recommended reconcile policy:**
- If `gap <= 2 hours` and a reminder is overdue, collapse all missed occurrences into one catch-up occurrence.
- If the catch-up moment lands inside quiet hours or outside the reminder active window, defer it to the nearest allowed time and keep `next_due_kind = catch_up`.
- If `gap > 2 hours`, compute a fresh next due from current time and reset `next_due_kind = normal`.
- If `pause_until_utc` is active during the gap, do not accumulate anything. Recompute from `max(now, pause_until_utc)` and keep `next_due_kind = normal`.

This satisfies the locked policy while avoiding Phase 3 occurrence history.

### Pattern 5: Use Tauri Events Only for Small Invalidation, Not Scheduler State Transport

**What:** Emit a tiny invalidation event such as `scheduler:changed` from Rust after the runtime updates persisted state; React listens and refetches typed commands.

**When to use:** For dashboard refresh while the app is open.

**Why this is the smallest stable UI bridge:**
- Official Tauri docs explicitly say events are for small payloads and are not designed for high-throughput streaming.
- Refetching typed commands keeps the real data contract on commands, where the app already lives.
- It avoids keeping duplicated queue state in React.

**Do not do this instead:** serialize the whole due queue or reminder runtime graph into event payloads.

## Data Model Recommendation

### Reminder-Level Allowed Hours

Use one optional `TimeWindow` object on each reminder schedule variant.

**Recommended TypeScript contract:**

```typescript
type TimeWindow = {
  startMinuteOfDay: number;
  endMinuteOfDay: number;
};

type IntervalSchedule = {
  kind: "interval";
  everyMinutes: number;
  anchorMinuteOfDay: number;
  activeWindow?: TimeWindow | null;
};

type FixedTimeSchedule = {
  kind: "fixed_time";
  weekdays: number[];
  times: number[];
  activeWindow?: TimeWindow | null;
};
```

**Why minute-of-day integers are still the right fit:**
- They match the Phase 1 data model.
- They naturally support cross-midnight windows like 21:00 to 06:00.
- They keep all time-window math in local wall-clock space without timezone serialization churn.

### Global Quiet Hours

Use the singleton `scheduler_state` row, not a reminder field.

**Recommended semantics:**
- Disabled quiet hours store `quiet_hours_enabled = 0` and null minutes.
- Enabled quiet hours require distinct start and end minutes.
- Cross-midnight is valid and should be interpreted by the same `TimeWindow` helper logic used for reminder windows.

### Pause-All

Persist `pause_until_utc` only. Do not persist a replay list, paused reminder IDs, or missed-occurrence backlog.

**Resume semantics:**
- If `pause_until_utc` is still in the future at startup, the scheduler is globally paused until that instant.
- If `pause_until_utc` is in the past at startup, clear it during reconciliation and compute from current time.
- “Rest of today” should resolve to the next local midnight converted to UTC at the moment the user picks the preset.

### Recovery Metadata

Persist only the minimum needed for deterministic recovery:
- `scheduler_state.last_reconciled_at_utc`
- `reminders.next_due_at`
- `reminders.next_due_kind`

Do not add event history, “last delivered at,” or diagnostic counters in this phase.

## Due Queue And Recovery Guidance

### Rust Runtime Evolution Path on Current Code

1. Keep [src-tauri/src/domain/schedule.rs](src-tauri/src/domain/schedule.rs) as the schedule authority, but split its responsibilities into:
   - base recurrence computation
   - active-window eligibility
   - nearest-allowed-time deferral
2. Add [src-tauri/src/domain/scheduler.rs](src-tauri/src/domain/scheduler.rs) for app-wide quiet-hours, pause-all, and reconciliation policy.
3. Add [src-tauri/src/runtime/scheduler.rs](src-tauri/src/runtime/scheduler.rs) for the in-memory queue and sleep loop.
4. Keep [src-tauri/src/persistence/reminders.rs](src-tauri/src/persistence/reminders.rs) responsible for persisted reminder rows, but give it explicit methods for runtime refreshes instead of mutating on list-read.
5. Add [src-tauri/src/persistence/scheduler_state.rs](src-tauri/src/persistence/scheduler_state.rs) for the singleton row.

### Important Change to Current Repository Behavior

Today [src-tauri/src/persistence/reminders.rs](src-tauri/src/persistence/reminders.rs) calls `refresh_next_due()` while listing reminders and recomputes from `Utc::now()`. That was acceptable in Phase 1, but it is not the right long-term shape for Phase 2 because:
- listing data should not silently become the main reconciliation path
- quiet-hours, pause-all, and catch-up semantics need a dedicated policy context, not a bare `compute_next_due(now)`
- recovery after sleep/wake needs to be triggered deliberately, not only when the UI asks for a list

The planner should therefore move reconciliation out of `list()` and into explicit runtime/persistence methods in 02-01.

### Short Gap vs Long Gap Policy

Use these exact planner-safe rules:

| Gap | Rule | Persisted Result |
|-----|------|------------------|
| `<= 2h` | collapse missed occurrences into one catch-up | `next_due_at = nearest_allowed(now)` and `next_due_kind = catch_up` |
| `> 2h` | discard stale missed occurrences and recompute fresh | `next_due_at = compute_from(now)` and `next_due_kind = normal` |
| any gap while pause-all active | never catch up | `next_due_at = compute_from(max(now, pause_until))` and `next_due_kind = normal` |

**Nearest allowed time** means the first local wall-clock instant that satisfies:
- not inside quiet hours
- inside the reminder active window, if one exists

### Code-Level Recommendation for Recovery Tests

Do not test recovery only through Tauri commands. Add pure Rust unit tests around a reconciliation function that takes:
- prior persisted reminder state
- scheduler state
- `last_reconciled_at`
- `now`

That function should return a `ReconcileDecision` enum with enough detail to assert:
- normal recompute
- catch-up recompute
- defer-after-quiet-hours
- defer-after-active-window

This is how the planner avoids burying DELV-04 inside hard-to-debug integration tests.

## UI And Tauri Boundary Guidance

### Minimal UI Expansion Strategy

Use the UI contract literally and add only two new editing surfaces:

1. A scheduler control strip inside [src/app/AppShell.tsx](src/app/AppShell.tsx)
2. An allowed-hours subsection inside [src/features/reminders/components/ReminderDrawer.tsx](src/features/reminders/components/ReminderDrawer.tsx)

**What not to add:**
- no settings route
- no separate scheduler page
- no new modal flow for quiet hours
- no per-row pause or quiet-hours controls

### Minimal Tauri Command Expansion

Add a small new command module instead of overloading reminder commands:

```text
get_scheduler_snapshot() -> SchedulerSnapshot
save_quiet_hours(input) -> SchedulerSnapshot
pause_all(preset) -> SchedulerSnapshot
resume_all() -> SchedulerSnapshot
reconcile_scheduler(reason) -> SchedulerSnapshot   # optional internal/admin command, not necessarily exposed to UI
```

Keep reminder CRUD commands in [src-tauri/src/commands/reminders.rs](src-tauri/src/commands/reminders.rs), but extend the save payload to include the optional `activeWindow` field.

### Frontend Refresh Strategy

`AppShell` should load both reminders and the scheduler snapshot together. The smallest stable pattern is:
- initial load: `Promise.all([listReminders(), getSchedulerSnapshot()])`
- after quiet-hours/pause mutations: refetch both
- while runtime is active: listen for a small `scheduler:changed` event and refetch both

This keeps React state flat and avoids introducing a global store for one dashboard.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| App-wide policy persistence | Frontend local state or Store-first split storage | SQLite singleton `scheduler_state` row | Recovery logic already depends on SQL reminder state |
| Wake/rebuild signaling | Ad hoc booleans and one-off channels per command | `tokio::sync::watch` for latest-state invalidation | Officially documented fit for config-like state changes |
| Runtime refresh transport | Full queue streaming over events | Tiny invalidation event plus refetch | Matches Tauri event guidance and keeps typed DTOs on commands |
| Allowed-hours parsing | Free-form strings in the domain layer | minute-of-day integers with one shared `TimeWindow` helper | Cross-midnight and overlap logic stay deterministic |
| Catch-up semantics | Replay every missed occurrence | single `catch_up` next-due marker | Locked product policy explicitly forbids burst replay |

**Key insight:** Phase 2 should hand-roll the scheduling policy, not the storage split, not a bespoke UI event bus, and not an occurrence history system.

## Common Pitfalls

### Pitfall 1: Letting `list_reminders()` Remain the Hidden Reconciliation Engine

**What goes wrong:** listing reminders mutates persisted state opportunistically, which makes wake/relaunch behavior impossible to reason about.

**Why it happens:** the current Phase 1 repository refreshes `next_due_at` during reads.

**How to avoid:** move reconciliation into explicit runtime calls and keep list queries side-effect free by the end of 02-01.

**Warning signs:** reading the dashboard changes state even when no lifecycle event occurred.

### Pitfall 2: Modeling Quiet Hours as UTC Timestamps

**What goes wrong:** 22:00 to 08:00 shifts incorrectly after timezone changes or DST.

**Why it happens:** global quiet hours are wall-clock policy, not absolute instants.

**How to avoid:** persist quiet hours and active windows as local minute-of-day values and evaluate them against local calendar context.

**Warning signs:** cross-midnight windows need special-case UTC math everywhere.

### Pitfall 3: Treating Pause-All as a Queue Freeze

**What goes wrong:** reminders pile up while paused and then replay in a burst when the pause ends.

**Why it happens:** developers pause the worker loop but leave reminder state conceptually overdue.

**How to avoid:** make pause-all a recomputation rule, not a backlog mode. When pause ends, compute from resume time and discard missed intervals.

**Warning signs:** planner language mentions “resume replay” or “drain the paused queue.”

### Pitfall 4: Hiding Catch-Up State in Ephemeral Memory Only

**What goes wrong:** after relaunch, the UI can no longer tell whether the next due item is a normal occurrence or a catch-up occurrence.

**Why it happens:** only `next_due_at` is persisted.

**How to avoid:** persist one small `next_due_kind` field and keep everything else transient.

**Warning signs:** “Catch-up next” can only appear until the next refresh.

### Pitfall 5: Expanding Into Phase 3 Notification Semantics

**What goes wrong:** planners add delivery queues, notification permissions, or occurrence history to make the runtime feel complete.

**Why it happens:** lifecycle recovery and due-queue work looks adjacent to delivery.

**How to avoid:** Phase 2 decides only the next valid occurrence and current suppression state. Delivery and action semantics remain deferred.

**Warning signs:** new tables or commands mention notification IDs, dismissals, or delivery attempts.

## Code Examples

Verified patterns from official docs plus the current codebase:

### Managed Runtime State in Tauri

```rust
use std::sync::Mutex;
use tauri::{Manager, State};

struct SchedulerRuntimeHandle {
    // sender, join handle, or small coordinator state
}

type SchedulerRuntimeState = Mutex<SchedulerRuntimeHandle>;

#[tauri::command]
fn get_scheduler_snapshot(
    app: tauri::AppHandle,
    runtime: State<'_, SchedulerRuntimeState>,
) -> Result<SchedulerSnapshot, String> {
    let _runtime = runtime.lock().unwrap();
    SchedulerRepository::for_app(&app)?.snapshot()
}
```

Source: Tauri state-management docs confirm `app.manage(...)` and `State<T>` are the intended pattern for managed native runtime state.

### Rust-to-Frontend Invalidation Event

```rust
use tauri::{AppHandle, Emitter};

fn emit_scheduler_changed(app: &AppHandle) {
    let _ = app.emit("scheduler:changed", ());
}
```

Source: Tauri calling-frontend docs recommend events for small payloads. That fits invalidation, not full runtime transport.

### Watch-Driven Runtime Loop

```rust
use tokio::sync::watch;
use tokio::time::{sleep, Duration};

async fn run_scheduler(mut rx: watch::Receiver<()>) {
    loop {
        let next_wait = Duration::from_secs(30);
        tokio::select! {
            _ = sleep(next_wait) => {
                // wake for next due candidate
            }
            result = rx.changed() => {
                if result.is_err() {
                    break;
                }
                let _ = rx.borrow_and_update();
                // rebuild from latest persisted state
            }
        }
    }
}
```

Source: Tokio docs describe `watch` as a last-value channel suitable for configuration changes, and `sleep` as a cancellable timer future.

## Planner Guidance

### Recommended 3 Plan Boundaries

1. **02-01: Refactor native schedule authority into scheduler domain plus due-queue runtime skeleton**
   - Add `tokio`
   - Move reconciliation out of [src-tauri/src/persistence/reminders.rs](src-tauri/src/persistence/reminders.rs) list reads
   - Extend schedule DTOs with `activeWindow`
   - Add `scheduler_state` persistence and a managed runtime worker skeleton
   - Add small scheduler snapshot commands

2. **02-02: Ship quiet hours, pause-all, and drawer allowed-hours UI on top of the new native snapshot**
   - Add the dashboard control strip in [src/app/AppShell.tsx](src/app/AppShell.tsx)
   - Add quiet-hours edit popover and pause-all preset menu
   - Extend [src/features/reminders/components/ReminderDrawer.tsx](src/features/reminders/components/ReminderDrawer.tsx) with allowed-hours editing and validation
   - Expose reminder/runtime status labels through typed read models

3. **02-03: Harden relaunch and sleep/wake reconciliation, add catch-up UI state, and close the validation matrix**
   - Add the 2-hour reconciliation policy and `next_due_kind`
   - Wire startup reconciliation in [src-tauri/src/lib.rs](src-tauri/src/lib.rs)
   - If a macOS wake hook is added, isolate it behind `runtime/lifecycle.rs` so the policy code stays platform-agnostic
   - Complete Rust lifecycle tests and UI state-presentation tests

### Dependency Order Between Plans

| Plan | Depends On | Why |
|------|------------|-----|
| 02-01 | Phase 1 only | establishes the native structures every other plan consumes |
| 02-02 | 02-01 | UI should bind to a real scheduler snapshot and real persistence semantics |
| 02-03 | 02-01 and 02-02 | recovery hardening needs final data-model fields and visible runtime states |

### File-Level Guidance

**[src-tauri/src/domain/schedule.rs](src-tauri/src/domain/schedule.rs)**
- keep all pure schedule math here
- add helpers for `is_time_window_allowed`, `next_allowed_local_time`, and base recurrence computation
- do not put SQL access or Tauri event emission here

**[src-tauri/src/persistence/reminders.rs](src-tauri/src/persistence/reminders.rs)**
- stop refreshing next due during list reads
- add explicit methods like `recompute_all_effective_due_times(...)` and `update_runtime_due(...)`
- keep repository methods deterministic and testable without UI

**[src-tauri/src/lib.rs](src-tauri/src/lib.rs)**
- remain the composition root only
- register the runtime manager in `setup`
- spawn the scheduler worker there
- do not let reconciliation policy leak into `run()`

**[src/app/AppShell.tsx](src/app/AppShell.tsx)**
- keep local reminder state ownership
- add one additional local state branch for `SchedulerSnapshot`
- fetch reminders and snapshot together
- host the scheduler control strip between top bar and hero, matching [src/app/AppShell.tsx](src/app/AppShell.tsx) existing shell responsibilities

**[src/features/reminders/components/ReminderDrawer.tsx](src/features/reminders/components/ReminderDrawer.tsx)**
- append allowed-hours after existing advanced schedule controls
- do not fork the drawer into a second stepper or modal
- reuse current form schema and validation pattern

### Hard Planning Boundaries

- Do not add desktop notifications, notification permissions, or action semantics.
- Do not add occurrence history, missed-event ledgers, or diagnostics panels.
- Do not add a settings route or dedicated settings page.
- Do not add a global frontend state library.
- Do not redesign the reminder persistence model into many normalized tables unless a Phase 2 query strictly requires it.
- Do not make wake handling depend on a Phase 3 notification plugin.
- Do not invent “replay queues” or “missed occurrence lists.” Phase 2 only decides the next valid due state.

## State Of The Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Read-time recompute from a bare schedule | Explicit scheduler policy plus runtime reconciliation | Needed at Phase 2 boundary | Makes lifecycle recovery testable and predictable |
| Store app policy in frontend or key-value storage by convenience | Keep reminder state and scheduler policy in one SQL-backed domain model | Current best fit for this repo | Avoids split ownership across SQLite and Store |
| One timer per reminder | Rebuildable due queue plus persisted next-due state | Standard native-scheduler pattern | Survives relaunch and sleep/wake better |
| UI-only status labels | Persisted `next_due_kind` plus runtime snapshot | Required by catch-up UI semantics | Lets the UI distinguish normal next due from recovery state |

**Deprecated or outdated for this phase:**
- relying on [src-tauri/src/persistence/reminders.rs](src-tauri/src/persistence/reminders.rs) list reads to reconcile runtime timing
- using React timers to drive due-state updates
- splitting quiet-hours and pause-all storage away from SQLite before there is a compelling reason

## Open Questions

1. **How should the repo observe macOS sleep/wake events?**
   - What we know: Apple documents `NSWorkspace.willSleepNotification` and `NSWorkspace.didWakeNotification`, and they must be registered on the workspace notification center.
   - What's unclear: which Rust interop crate is the least-risk fit for this repo has not been verified in current code.
   - Recommendation: isolate the adapter behind `runtime/lifecycle.rs`; keep the reconciliation policy pure so 02-03 is not blocked on the platform bridge.

2. **Should `next_due_kind` live on the reminder row or in a future reminder-state table?**
   - What we know: Phase 2 needs a durable catch-up marker for UI state.
   - What's unclear: a later Phase 3/4 normalization may move this to a dedicated state table.
   - Recommendation: keep it on the reminder row in Phase 2 for the smallest migration and easiest list queries.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Rust `cargo test` for native scheduling/persistence + Vitest 4.1.0 with Testing Library for React |
| Config file | [vite.config.ts](vite.config.ts) |
| Quick run command | `cargo test && pnpm vitest run src/features/reminders/components/ReminderDrawer.test.tsx src/features/reminders/components/ReminderRow.test.tsx` |
| Full suite command | `cargo test && pnpm vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCHD-03 | quiet hours and reminder allowed-hours defer reminders to the nearest valid local wall-clock time, including cross-midnight cases | Rust unit + drawer component test | `cargo test domain::scheduler::tests::quiet_hours_and_active_window && pnpm vitest run src/features/reminders/components/ReminderDrawer.test.tsx -t "allowed hours"` | ✅ extend existing drawer test, ❌ native test file |
| SCHD-04 | pause-all presets persist across relaunch and resume without replaying missed reminders | Rust repository/runtime test + dashboard control test | `cargo test runtime::scheduler::tests::pause_all_recomputes_from_resume && pnpm vitest run src/features/reminders/components/SchedulerControlStrip.test.tsx` | ❌ Wave 0 |
| DELV-04 | relaunch or wake recovery collapses short gaps into one catch-up and long gaps into a fresh recompute | Rust reconciliation unit + app-shell rendering test | `cargo test domain::scheduler::tests::reconcile_gap_policy && pnpm vitest run src/app/AppShell.test.tsx -t "catch-up next"` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `cargo test`
- **Per wave merge:** `cargo test && pnpm vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src-tauri/src/domain/scheduler.rs` tests for quiet-hours, active-window overlap, and exact 2-hour threshold behavior
- [ ] `src-tauri/src/runtime/scheduler.rs` tests for pause-all resume semantics and queue rebuilds
- [ ] `src/features/reminders/components/SchedulerControlStrip.test.tsx` for quiet-hours and pause-all controls
- [ ] Extend `src/features/reminders/components/ReminderDrawer.test.tsx` with allowed-hours validation and save payload assertions
- [ ] `src/app/AppShell.test.tsx` for runtime state strip rendering and catch-up/paused labels
- [ ] If macOS wake integration ships in 02-03, add an adapter-level smoke test or narrow unit seam around lifecycle event forwarding

## Sources

### Primary (HIGH confidence)

- Tauri State Management docs: https://v2.tauri.app/develop/state-management/ — managed state, mutex guidance, and `Manager::state()` access patterns. Last updated 2025-05-07.
- Tauri Calling the Frontend docs: https://v2.tauri.app/develop/calling-frontend/ — small-payload event guidance and Rust↔frontend event APIs. Last updated 2025-05-12.
- Tauri Store plugin docs: https://v2.tauri.app/plugin/store/ — confirms Store is a persistent key-value store and requires new plugin permissions. Last updated 2025-11-10.
- Tokio `watch` docs: https://docs.rs/tokio/latest/tokio/sync/watch/ — last-value change propagation semantics suitable for scheduler invalidation.
- Tokio `sleep` docs: https://docs.rs/tokio/latest/tokio/time/fn.sleep.html — cancellable runtime timer semantics for a due queue loop.
- Apple `NSWorkspace.willSleepNotification`: https://developer.apple.com/documentation/appkit/nsworkspace/willsleepnotification — macOS sleep lifecycle hook semantics.
- Apple `NSWorkspace.didWakeNotification`: https://developer.apple.com/documentation/appkit/nsworkspace/didwakenotification — macOS wake lifecycle hook semantics.
- Workspace sources: [src-tauri/src/domain/schedule.rs](src-tauri/src/domain/schedule.rs), [src-tauri/src/persistence/reminders.rs](src-tauri/src/persistence/reminders.rs), [src-tauri/src/lib.rs](src-tauri/src/lib.rs), [src/app/AppShell.tsx](src/app/AppShell.tsx), [src/features/reminders/components/ReminderDrawer.tsx](src/features/reminders/components/ReminderDrawer.tsx), and planning docs under `.planning/`.

### Secondary (MEDIUM confidence)

- [ .planning/research/ARCHITECTURE.md ](.planning/research/ARCHITECTURE.md) — repo-level architectural precedent for Rust-owned scheduler and rebuildable due queue.
- [ .planning/research/PITFALLS.md ](.planning/research/PITFALLS.md) — lifecycle, timezone, and over-replay failure modes to preserve in planner checks.
- [ .planning/phases/01-reminder-foundation/01-RESEARCH.md ](.planning/phases/01-reminder-foundation/01-RESEARCH.md) and [ .planning/phases/01-reminder-foundation/01-04-SUMMARY.md ](.planning/phases/01-reminder-foundation/01-04-SUMMARY.md) — existing boundary decisions and established frontend/native patterns.

### Tertiary (LOW confidence)

- Exact Rust crate choice for a macOS sleep/wake bridge, because the platform adapter crate was not verified during this research and should remain an isolated implementation concern in 02-03.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - almost entirely builds on existing repo dependencies plus official Tauri/Tokio documentation.
- Architecture: HIGH - strongly constrained by the current Phase 1 persistence and dashboard structure.
- Recovery/lifecycle hook details: MEDIUM - policy is clear, but the exact macOS bridge crate remains unverified and should stay isolated.

**Research date:** 2026-03-20
**Valid until:** 2026-04-19