# Project Research Summary

**Project:** QuietBloom
**Domain:** Local-first desktop reminder and work-rhythm wellness app
**Researched:** 2026-03-19
**Confidence:** HIGH

## Executive Summary

QuietBloom sits in the same product family as desktop break and reminder tools such as Stretchly, Time Out, and BreakTimer, but its opportunity is not to become a generic task manager or habit dashboard. The research is consistent on one point: users only keep these products if reminders feel trustworthy, well timed, and low-friction. That makes reliable scheduling, native notification delivery, clear snooze semantics, and polished desktop interaction more important than feature breadth.

The recommended approach is a local-first Tauri application where React handles the editing and presentation flows while Rust owns the scheduling runtime, recovery logic, and desktop integrations. Reminder rules and history should live in SQLite, lightweight preferences should live in a simple store, and the roadmap should front-load persistence and scheduler reliability before visual extras. The highest-risk failure mode is building reminders as UI timers or treating notification requests as proof of delivery; both lead directly to missed reminders and loss of trust.

## Key Findings

### Recommended Stack

Keep the current Tauri 2 + React 19 + TypeScript + Vite foundation and add only the native pieces that directly support a trustworthy reminder product. The stack should stay small: native notification support, SQLite-backed reminder storage, a lightweight settings store, a single-instance guard, logging, and optional launch-at-login support.

**Core technologies:**
- Tauri 2: desktop shell and native capability boundary — already the correct foundation for a local-first reminder app
- React 19 + TypeScript: UI composition and typed client contracts — suitable for reminder editors, history views, and polished desktop interaction
- SQLite via Tauri SQL plugin: durable reminder, schedule, and history storage — required for recovery and trustworthy recurrence handling
- Tauri Notification plugin: native reminder delivery — necessary for a credible desktop reminder experience
- Store, log, window-state, single-instance, and autostart plugins: app preferences, diagnostics, polish, duplicate-process protection, and optional always-on behavior

### Expected Features

The research clearly separates table-stakes reminder behavior from later differentiators. v1 must cover multiple reminders, interval and fixed-time schedules, quiet hours, snooze/skip/pause actions, local persistence, and at least lightweight history. Features like adaptive rhythms, analytics-heavy dashboards, AI coaching, and cloud sync are legitimate future directions, but they do not belong in the first release.

**Must have (table stakes):**
- Multiple reminder items — users expect more than one wellness routine
- Flexible scheduling — interval-based and fixed-time reminders with weekday and active-window support
- Snooze, skip, and temporary pause — users need quick control when they cannot act immediately
- Native reminder delivery and persistence — reminders must survive restarts and normal desktop lifecycle events
- Lightweight history and clear state visibility — users need to know what fired, what was completed, and what was missed

**Should have (competitive):**
- Preset-friendly setup — lower-friction creation for common routines like hydration or stretch breaks
- Strong visual polish — interruption surfaces should feel intentional, not raw or clinical
- Desktop-quality controls — permission health, window state, and launch-at-login settings

**Defer (v2+):**
- AI-generated reminder plans and coaching
- Cloud sync and accounts
- Advanced analytics, streak systems, and social/gamified layers
- Context-aware or adaptive reminder timing beyond basic quiet hours

### Architecture Approach

The strongest architecture pattern for this product is a Rust-owned scheduler built from persisted reminder definitions and materialized next-fire timestamps. React should behave as a client for reminder authoring and visibility, not as the authority for recurrence or delivery timing.

**Major components:**
1. Reminder UI and application service boundary — create, edit, list, and act on reminders
2. Native scheduler runtime — compile schedules, maintain the due queue, reconcile after relaunch or sleep, and dispatch due events
3. Persistence and history layer — store reminder definitions, next-fire state, and user-visible event history
4. Notification and settings adapters — bridge reminder events to native notifications, permissions, logging, and desktop preferences

### Critical Pitfalls

1. **Using UI timers as the reminder engine** — avoid by persisting due timestamps and moving scheduling into Rust
2. **Treating notification requests as successful delivery** — avoid by modeling permission and delivery state explicitly and surfacing failures in-app
3. **Ignoring sleep, wake, clock changes, and time-zone changes** — avoid by adding reconciliation and clear catch-up rules early
4. **Ambiguous snooze, dismiss, skip, and complete semantics** — avoid by modeling reminder occurrence actions cleanly and idempotently
5. **Overbuilding v1 before trust is proven** — avoid by limiting first-release scope to creation, scheduling, delivery, actions, and visual quality

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Reminder Foundation
**Rationale:** Reliable reminder products start with durable definitions and a stable local data model, not UI effects.
**Delivers:** Reminder CRUD, persisted local storage, basic schedule authoring, and upcoming state read models.
**Addresses:** Multiple reminder items, interval and fixed-time setup, local persistence.
**Avoids:** React-owned scheduling and schema churn.

### Phase 2: Scheduling Semantics
**Rationale:** The next hard dependency is a scheduler that survives relaunch, sleep, and clock changes.
**Delivers:** Schedule compilation, due queue management, quiet hours, pause behavior, and recovery rules.
**Uses:** Rust runtime, SQLite state, and explicit schedule semantics.
**Implements:** Scheduler worker and reconciliation path.

### Phase 3: Delivery and Reminder Actions
**Rationale:** Once reminders can become due reliably, the app can safely layer in desktop delivery and interaction behavior.
**Delivers:** Native notifications, permission health, snooze/skip/complete flows, and reminder action semantics.
**Uses:** Notification plugin, single-instance protection, and logging.
**Implements:** Notification adapter and occurrence action handling.

### Phase 4: Daily Control Surface
**Rationale:** A reminder app becomes pleasant and trustworthy when users can see status, recent outcomes, and tweak settings without friction.
**Delivers:** Dashboard polish, history view, progressive reminder editor UX, and desktop settings such as default snooze and launch-at-login.
**Uses:** Existing runtime and persistence foundation.
**Implements:** User-visible history and settings surface.

### Phase Ordering Rationale

- Persistence comes before scheduling because reliable next-fire state depends on durable reminder definitions.
- Scheduling comes before notifications because delivery code should consume due events, not define them.
- Reminder actions come after scheduler reliability because snooze and completion semantics are unsafe on top of a weak runtime.
- History and polish come last because they are most useful once reminder data and actions are trustworthy.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** Sleep/wake reconciliation, overdue reminder policy, and time semantics need careful design decisions
- **Phase 3:** Notification behavior in installed macOS builds and foreground presentation rules need explicit validation

Phases with standard patterns:
- **Phase 1:** CRUD, persistence, and schedule-form modeling are straightforward with the chosen stack
- **Phase 4:** History views and settings surfaces follow well-established desktop patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Based on current Tauri plugin ecosystem and direct fit for a local-first desktop reminder app |
| Features | HIGH | Multiple products agree on table stakes and common user expectations |
| Architecture | HIGH | Research converges on persisted scheduling, native delivery, and restart-safe recovery |
| Pitfalls | HIGH | Failure modes are concrete, recurring, and well-understood in timer-driven desktop tools |

**Overall confidence:** HIGH

### Gaps to Address

- macOS notification UX edge cases: validate foreground behavior and permission recovery during implementation planning
- Sleep/wake reconciliation policy: choose whether overdue reminders fire immediately, collapse, or mark as missed based on UX testing
- Scope line for launch-at-login and tray behavior: confirm whether both are needed in v1 planning or if one can slip safely

## Sources

### Primary (HIGH confidence)
- Tauri official plugin docs — notification, SQL, store, autostart, log, window-state, single-instance usage
- Official product sites and help docs for Time Out, Stretchly, BreakTimer, Focus To-Do, and Habitify — expected feature patterns and user-facing reminder behaviors

### Secondary (MEDIUM confidence)
- Rust and SQLite documentation on timer primitives, local persistence, and application-local database usage
- Domain comparisons across reminder, break, and habit tools for feature prioritization

---
*Research completed: 2026-03-19*
*Ready for roadmap: yes*