# Phase 2: Scheduling Engine - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers QuietBloom's scheduling runtime semantics: quiet hours, reminder-level active windows, pause-all behavior, and lifecycle recovery after relaunch, sleep, or wake. It does not include native notification delivery, snooze, skip, complete actions, permission health UI, or history timelines.

</domain>

<decisions>
## Implementation Decisions

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

</decisions>

<specifics>
## Specific Ideas

- Quiet hours should feel like a calm protection layer, not a hard-to-understand scheduling exception system
- Recovery should avoid the common failure mode where a laptop wakes and immediately floods the user with stale reminders
- Active windows belong with schedule editing, because users will understand them as part of a reminder's timing, not as a separate settings concept
- The scheduler should distinguish elapsed-duration rules from wall-clock rules and treat lifecycle reconciliation as a first-class path

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product scope
- .planning/PROJECT.md — product definition, constraints, and v1 boundaries
- .planning/REQUIREMENTS.md — exact Phase 2 requirement set and v1 traceability
- .planning/ROADMAP.md — Phase 2 goal, success criteria, and three-plan target
- .planning/STATE.md — current focus, completed Phase 1 work, and reliability concerns

### Prior phase context
- .planning/phases/01-reminder-foundation/01-CONTEXT.md — approved UX and schedule-authoring decisions carried forward into Phase 2
- .planning/phases/01-reminder-foundation/01-RESEARCH.md — frontend/native boundary rationale and Phase 1 hard boundaries
- .planning/phases/01-reminder-foundation/01-04-SUMMARY.md — final Phase 1 scheduler and drawer state

### Research context
- .planning/research/SUMMARY.md — architecture rationale, phase ordering, and reliability priorities
- .planning/research/ARCHITECTURE.md — Rust-owned scheduler, due queue, recovery flow, and component split
- .planning/research/PITFALLS.md — lifecycle, timezone, and over-replay pitfalls to avoid

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- src-tauri/src/domain/schedule.rs — already computes authoritative next_due_at for interval and fixed_time schedules and is the natural home for schedule compilation extensions
- src-tauri/src/persistence/reminders.rs — persists reminder definitions and next_due_at, but currently has no scheduler worker state, quiet-hour state, or recovery markers
- src-tauri/src/lib.rs — current native entrypoint only wires CRUD commands and SQL plugin; Phase 2 can introduce scheduler initialization here
- src/app/AppShell.tsx — current dashboard shell already owns the top bar and can host lightweight global controls without adding routing
- src/features/reminders/components/ReminderDrawer.tsx — existing progressive schedule editor is the right place to reveal reminder-level active windows

### Established Patterns
- Rust owns schedule authority and writes persisted next_due_at values before React renders them
- React uses typed wrapper calls and local feature state rather than a global state library
- The current reminder schema persists one schedule_json payload; Phase 2 should evolve that payload rather than add a separate frontend-only timing model

### Integration Points
- Quiet hours and pause-all likely need persisted app-level settings in a lightweight store or dedicated persistence layer, separate from per-reminder rows
- Reminder-level active windows will extend the existing schedule union and therefore affect both TypeScript contracts and Rust serde models
- Recovery behavior needs lifecycle hooks at app startup now, and likely wake/resume hooks that later feed Phase 3 notification delivery

</code_context>

<deferred>
## Deferred Ideas

- Native desktop notifications, permission recovery, and user-visible delivery health — Phase 3
- Snooze, skip, complete, dismiss, and occurrence-level action semantics — Phase 3
- Reminder history, missed-event review, and daily retrospection — Phase 4
- Full settings page, launch-at-login, and richer app preferences — Phase 4 unless planning proves a smaller prerequisite is unavoidable

</deferred>

---
*Phase: 02-scheduling-engine*
*Context gathered: 2026-03-20*