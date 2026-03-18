# Architecture Patterns

**Domain:** Desktop reminder and work-rhythm wellness apps
**Project:** QuietBloom
**Researched:** 2026-03-18
**Overall confidence:** HIGH for Tauri-local architecture choices, MEDIUM for generic reminder-domain conventions

## Recommended Architecture

Desktop reminder systems are usually best structured around a persisted reminder model plus a native runtime that continuously projects that model into the next due notifications. The core mistake is to treat reminders as frontend timers. In a desktop app, the durable source of truth should be persisted schedules and reminder instances, while the runtime scheduler is a recoverable execution engine that can be rebuilt at launch.

For QuietBloom, the right structure is:

```text
React UI
  -> Reminder application service boundary
  -> Tauri command/event boundary
  -> Rust app runtime
       |- Schedule compiler
       |- Due queue / scheduler worker
       |- Notification adapter
       |- Persistence layer
       |- Settings service
       |- History + diagnostics service
```

The practical split is:

- React owns editing, presentation, and optimistic UX.
- Rust owns scheduling, startup reconciliation, notification delivery, and durable system coordination.
- SQLite owns reminder definitions, computed next-fire state, and user-visible history.
- Lightweight key-value storage owns app preferences that do not need relational querying.

This keeps reminder delivery reliable when the window reloads, the app restarts, or the frontend is temporarily unavailable.

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Reminder UI | Create, edit, pause, delete reminders; show next occurrence; capture snooze/skip/complete actions | Application service, settings UI, history UI |
| Application Service Boundary | Validate frontend payloads, map UI actions to domain commands, return read models | Tauri commands, Rust domain services |
| Schedule Definition Model | Represent interval, fixed-time, weekdays, quiet hours, snooze policy, enable/disable state | Persistence layer, schedule compiler |
| Schedule Compiler | Convert reminder rules into the next actionable due time and future recurrence behavior | Scheduler worker, persistence layer |
| Scheduler Worker | Load active reminders, maintain in-memory due queue, wake on next deadline, recover after restart | Schedule compiler, notification adapter, settings service, history service |
| Notification Adapter | Translate due reminder instances into native desktop notifications and foreground app events | Scheduler worker, Tauri notification plugin, UI event channel |
| Reminder Repository | Persist reminders, instances, next-fire timestamps, completion/snooze outcomes | SQLite database, schedule compiler, query services |
| Settings Service | Store app-wide preferences such as notification permission state, launch-on-login, default snooze, sound, quiet hours | Store plugin or config file, scheduler worker, UI |
| History Service | Record user-visible reminder events: fired, snoozed, skipped, completed, missed, dismissed | Scheduler worker, notification adapter, reminder repository |
| Diagnostics / Log Service | Record internal operational logs for debugging delivery failures, migration issues, permission state, startup reconciliation | Rust runtime, Tauri log plugin |
| Runtime Composition Root | Register plugins, initialize database migrations, create shared state, spawn scheduler task, expose commands/events | All native services |

## Data Flow

### 1. Reminder authoring flow

1. User creates or edits a reminder in the React UI.
2. The UI sends a typed command across the Tauri boundary.
3. Rust validates the payload against domain rules.
4. The reminder definition is written to SQLite.
5. The schedule compiler calculates the next due occurrence.
6. The repository updates the materialized next-fire timestamp.
7. The scheduler worker is notified to rebuild or patch its in-memory queue.
8. The UI receives the updated reminder read model.

### 2. Runtime scheduling flow

1. On app startup, Rust runs database migrations and loads settings.
2. The scheduler worker queries all active reminders and their next-fire timestamps.
3. The worker builds an in-memory due queue ordered by next due time.
4. The worker sleeps until the earliest due item, then rechecks current time before firing.
5. When a reminder is due, the worker creates a reminder instance record and marks it as fired.
6. The notification adapter emits a native notification and optionally an in-app event.
7. The schedule compiler computes the following occurrence and persists the next-fire timestamp.
8. The queue advances without requiring the frontend to stay mounted.

### 3. User action flow after a reminder fires

1. The user opens the app or acts on the reminder inside the app.
2. The UI sends an action such as snooze, skip, complete, or dismiss.
3. Rust writes the action to reminder history.
4. If the action affects future timing, the schedule compiler recalculates next-fire.
5. The scheduler worker updates the queue.
6. The history view reads the event stream from SQLite.

### 4. Recovery flow after restart or sleep/wake

1. App launches or wakes after downtime.
2. The scheduler worker compares persisted next-fire timestamps against current wall-clock time.
3. Overdue reminders are reconciled according to policy: fire immediately, mark missed, or coalesce.
4. History records the reconciliation outcome.
5. Fresh next-fire timestamps are persisted.

This recovery path is what makes the system reliable. Without it, reminders become best-effort timers rather than a trustworthy product.

## Patterns to Follow

### Pattern 1: Persisted schedule plus materialized next-fire
**What:** Store both the reminder rule and the currently computed next-fire timestamp.
**When:** Always, unless reminder rules are trivial and one-shot only.
**Why:** Querying and ordering by a concrete next-fire value is simpler and more robust than re-evaluating every rule every second.

### Pattern 2: Rust-native scheduler, frontend as client
**What:** Keep long-lived scheduling in Rust, not in React effects.
**When:** For any reminder that must survive window reloads and frontend state resets.
**Why:** Tauri runtime state can outlive UI screens and is the correct place for OS-facing work.

### Pattern 3: Separate settings from reminder data
**What:** Use a lightweight store for preferences and SQLite for relational reminder state.
**When:** When some state is document-like and some state is query-heavy.
**Why:** Settings are simple key-value data, but reminder queries need filtering, ordering, history joins, and migrations.

### Pattern 4: Distinguish history from diagnostics
**What:** Keep a user-facing event history separate from operational logs.
**When:** Always.
**Why:** Users want to know what happened to reminders; developers need to know why the system behaved that way. Mixing them creates a noisy, unstable model.

### Pattern 5: Rebuildable in-memory queue
**What:** Treat the runtime queue as a cache derived from persisted state.
**When:** Always.
**Why:** It allows restart recovery, easier testing, and future tray/background modes without hidden state.

## Local-First Desktop Notes

### Data ownership
- Local-first means the app must work without a server and without cloud recovery.
- The persisted local database is therefore the system of record.
- A desktop reminder app should assume process restarts, laptop sleep, and webview reloads are normal events, not edge cases.

### Storage split
- Use SQLite for reminders, occurrence state, history, and future extensibility such as tags, templates, analytics snapshots, or per-reminder metadata.
- Use Tauri Store for lightweight preferences such as window/UI state, default snooze length, onboarding flags, and launch-on-login preference if not normalized into SQL.
- Avoid storing all reminder data in JSON settings files; that blocks efficient queries and schema evolution.

### Scheduling semantics
- Use wall-clock timestamps for due reminders and persist them.
- Reconcile after startup, sleep/wake, and manual clock changes.
- Avoid making frontend JavaScript timers the authority for recurrence.
- For interval mechanics inside Rust, timer primitives are fine, but they must be derived from persisted due timestamps rather than being the only state.

### Notification delivery
- Native notification delivery is an adapter, not the scheduler itself.
- Permission state must be checked and stored explicitly because delivery capability may change.
- Notification APIs vary by platform, so the app should keep a platform-neutral reminder event model and a platform-specific notification translation layer.

### Concurrency model
- For a single-user local desktop app, SQLite is a strong fit because write concurrency is low and durability matters more than distributed scale.
- Keep write transactions short and centralized in Rust services.
- Use managed Rust state for long-lived services; protect mutable shared runtime structures with the appropriate mutex strategy.

## Suggested Data Model Shape

The architecture becomes cleaner if the storage model separates durable definitions from transient execution:

| Table / Store | Purpose |
|---------------|---------|
| reminders | Reminder definitions, labels, enabled state, category, timezone behavior |
| schedules | Interval rules, fixed-time rules, weekday masks, quiet-window policy |
| reminder_state | Materialized next-fire timestamp, last-fired timestamp, pause-until, current status |
| reminder_history | Fired, snoozed, skipped, completed, dismissed, missed events |
| app_settings | Optional SQL home for settings that should be queryable or versioned |
| store.json / settings.json | Lightweight preferences that do not need relational joins |

Do not collapse all of this into a single reminders table if future extensibility matters. A small separation now avoids a schema rewrite when history and richer recurrence rules arrive.

## Anti-Patterns to Avoid

### Anti-Pattern 1: React-owned scheduling
**What:** Keeping reminder timers in component state, hooks, or browser intervals.
**Why bad:** Reloading the UI or remounting the component can silently lose schedule state.
**Instead:** Let React edit reminder definitions while Rust owns active scheduling.

### Anti-Pattern 2: Notification equals source of truth
**What:** Assuming the notification plugin's pending notifications are the authoritative schedule store.
**Why bad:** Notification systems are delivery channels with platform-specific behavior, not a full recurrence engine.
**Instead:** Persist reminder intent yourself, then emit notifications from that source.

### Anti-Pattern 3: One giant settings blob
**What:** Storing reminders, settings, and history in one JSON file.
**Why bad:** Hard to migrate, query, audit, or extend.
**Instead:** Use SQL for reminder domain data and key-value storage only for simple preferences.

### Anti-Pattern 4: No reconciliation on restart
**What:** Restarting the app and only scheduling future reminders from now onward.
**Why bad:** Missed reminders disappear, undermining trust.
**Instead:** Reconcile overdue items and record the result.

## Suggested Build Order

The correct build order is driven by reliability dependencies, not by UI visibility.

### Phase 1: Domain model + persistence foundation
Build first:
- Reminder and schedule schema
- SQLite integration and migrations
- Repository layer for reminders, state, and history
- Settings storage contract

Why first:
- Every later capability depends on durable reminder definitions and restart-safe state.
- It is cheaper to stabilize the data model before building polished flows on top.

### Phase 2: Scheduler runtime and reconciliation
Build next:
- Schedule compiler
- In-memory due queue
- Startup hydration and overdue reconciliation
- Sleep/wake and restart-safe rescheduling behavior

Why second:
- This is the actual core product behavior.
- Without it, notification UX is only a demo layer.

### Phase 3: Notification delivery adapter
Build next:
- Notification permission checks
- Native notification sending
- Foreground/in-app reminder event bridge
- Failure logging around delivery

Why third:
- Delivery should sit on top of a scheduler that already knows what is due.
- This keeps notification code thin and replaceable.

### Phase 4: Reminder management UI and settings UI
Build next:
- CRUD screens for reminders
- Schedule editors for interval and fixed-time rules
- Settings for defaults, quiet hours, notifications, launch-on-login
- Read models for upcoming reminders

Why fourth:
- Once the domain and runtime exist, the UI can be built against real behavior instead of mocks that later drift.

### Phase 5: User-visible history and internal observability
Build next:
- Reminder history timeline
- Delivery status feedback
- Log file configuration and diagnostic export paths

Why fifth:
- History proves trustworthiness to users.
- Logs reduce debugging cost when reminder delivery fails on specific machines.

### Phase 6: Extensibility layer
Build later:
- Tray integration and background window behavior
- Launch-on-login / autostart
- Templates, tags, preset routines
- Import/export, backup, future sync hooks
- Analytics derived from history

Why later:
- These features are easiest once the core data model and runtime are stable.
- Extensibility should plug into existing services rather than changing their ownership boundaries.

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| Reminder count per device | Simple local queue is enough | Still local per device; optimize indexes | Still local per device; complexity is per-device, not global |
| History growth | Basic append-only table | Add retention policy and archive/export | Add summarization and compaction |
| Scheduling complexity | Interval + fixed-time rules | Add richer recurrence compiler carefully | Modular rule engine or plugin architecture |
| Delivery diagnostics | Plain logs | Structured log filtering and support export | Privacy-aware support bundles and automated checks |

For QuietBloom v1, the relevant scale is per-device complexity, not multi-tenant backend scale. This favors a simple local architecture with strong recovery semantics.

## Architecture Recommendation For QuietBloom

Use a local-first, Rust-owned scheduler architecture with SQLite as the domain store and Tauri Store as lightweight preference storage. Model reminders as durable schedule definitions plus materialized next-fire state. Drive all notifications from the native runtime, not from React timers. Keep reminder history separate from operational logs. Build the product in the order: persistence, scheduler, notification adapter, UI/settings, history/logging, then extensibility.

That order matches the actual dependency chain of a trustworthy desktop reminder app.

## Sources

- Tauri State Management docs, updated 2025-05-07: https://v2.tauri.app/develop/state-management/ (HIGH)
- Tauri Notification plugin docs, updated 2024-11-10: https://v2.tauri.app/plugin/notification/ (HIGH)
- Tauri SQL plugin docs, updated 2025-11-04: https://v2.tauri.app/plugin/sql/ (HIGH)
- Tauri Store plugin docs, updated 2025-11-10: https://v2.tauri.app/plugin/store/ (HIGH)
- Tauri Logging plugin docs, updated 2025-07-03: https://v2.tauri.app/plugin/logging/ (HIGH)
- Tauri Autostart plugin docs, updated 2025-02-22: https://v2.tauri.app/plugin/autostart/ (HIGH)
- Tokio time module docs: https://docs.rs/tokio/latest/tokio/time/index.html (HIGH for timer primitive behavior)
- SQLite guidance on application-local storage, updated 2025-05-31: https://www.sqlite.org/whentouse.html (HIGH)