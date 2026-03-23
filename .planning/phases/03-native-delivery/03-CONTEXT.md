# Phase 3: Native Delivery - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers QuietBloom's first native delivery loop: due reminders must produce desktop notifications, users must be able to act on those due occurrences through snooze, skip, complete, and dismiss semantics, and the app must surface delivery permission or health problems clearly enough to recover trust. It does not add reminder history timelines, a full settings page, or broader daily-polish work from Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Notification Presentation Strategy
- Native notifications should fire even when the QuietBloom window is already in the foreground so delivery behavior stays consistent across app states
- Multiple reminders that become due within a short delivery window should collapse into a summary notification rather than exploding into one notification per reminder
- If the user closes a notification without choosing an action, that occurrence remains pending; dismiss only closes the surface and does not resolve the occurrence
- Catch-up occurrences recovered from short interruptions should be delivered like ordinary due reminders as soon as they become allowed

### Occurrence Action Semantics
- Phase 3 snooze should ship with preset durations only; no custom freeform snooze input yet
- Skip should discard only the current due occurrence and advance the reminder to the next normal occurrence without backlog replay
- Complete should confirm the current due occurrence and then advance according to the reminder's existing schedule rules rather than re-anchoring from completion time
- Dismiss remains distinct from skip or complete so a user can close the native surface without silently changing reminder state

### Permission And Failure Recovery
- Permission or delivery problems should surface when the app first needs to deliver and fails, not preemptively on every startup
- When delivery is blocked, the main UI should explain the issue and provide a direct recovery action such as opening system settings or relevant help guidance
- Recovery handling in this phase should stay delivery-focused; it should not grow into a general settings area or unrelated platform preference flow

### Delivery Health And Logging Surface
- Delivery health should appear first as a lightweight status treatment on the main dashboard, with deeper detail revealed in a drawer or similarly lightweight secondary surface rather than a full settings page
- Phase 3 should record one summary log entry per delivery attempt and per occurrence action result so duplicate notifications, missed delivery, and action failures can be debugged later
- Diagnostic information should stay scoped to delivery reliability and user recovery; it should not become a full event history viewer that belongs to Phase 4

### Claude's Discretion
- Exact duration presets for snooze as long as they are a small fixed set
- Exact length of the notification coalescing window as long as it remains short and predictable
- Exact wording and visual hierarchy for delivery health states, recovery guidance, and native notification action labels
- Internal composition for notification adapters, pending-occurrence persistence, and platform-specific permission checks

</decisions>

<specifics>
## Specific Ideas

- Native delivery should feel dependable and calm, not noisy; grouped notifications should reduce burstiness without obscuring which reminders are pending
- Dismiss should be safe and reversible from the app surface so users do not accidentally mutate reminder state by clearing a notification banner
- Permission recovery should appear at the moment trust breaks, with a direct path to fix the problem instead of vague warning copy
- Delivery diagnostics should help answer "what happened to my reminder" without dragging the product into a full admin console

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product scope
- .planning/PROJECT.md — product definition, constraints, and v1 delivery expectations
- .planning/REQUIREMENTS.md — exact Phase 3 requirement set and traceability
- .planning/ROADMAP.md — Phase 3 goal, success criteria, and plan breakdown target
- .planning/STATE.md — current focus and reliability concerns

### Prior phase context
- .planning/phases/01-reminder-foundation/01-CONTEXT.md — approved dashboard, drawer, and authoring interaction model
- .planning/phases/02-scheduling-engine/02-CONTEXT.md — approved quiet-hours, pause-all, and recovery semantics that delivery must respect
- .planning/phases/02-scheduling-engine/02-03-SUMMARY.md — current lifecycle reconciliation and recovery-aware read model
- .planning/phases/02-scheduling-engine/02-VERIFICATION.md — verified Phase 2 closeout and auto-resume behavior

### Research context
- .planning/research/SUMMARY.md — overall architecture and milestone ordering rationale
- .planning/research/ARCHITECTURE.md — current Rust/React boundary and native-first reliability rationale
- .planning/research/PITFALLS.md — lifecycle, duplication, and scope pitfalls to avoid while planning delivery

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- src-tauri/src/runtime/scheduler.rs — already owns the rebuildable due queue and is the natural place to derive delivery candidates without inventing per-reminder timers
- src-tauri/src/runtime/lifecycle.rs — already centralizes startup and resume reconciliation, making it the right seam for delivery refresh after wake or relaunch
- src-tauri/src/commands/scheduler.rs — already exposes typed scheduler snapshots and reconciliation commands that delivery health can extend without leaking raw persistence details to React
- src-tauri/src/domain/reminder.rs — already carries `next_due_kind` and `runtime_status`, which can anchor occurrence-level delivery state without moving scheduling authority into the frontend
- src/app/AppShell.tsx — already refreshes reminder and scheduler state together and can host lightweight delivery health UI without adding routing
- src/features/reminders/components/NextReminderCard.tsx and src/features/reminders/components/ReminderRow.tsx — existing dashboard surfaces can reflect pending or failed delivery state before Phase 4 adds dedicated history

### Established Patterns
- Rust remains the source of truth for schedule state and lifecycle reconciliation; Phase 3 should keep notification decision-making and occurrence mutation native-side
- Frontend behavior is driven through narrow typed wrapper functions rather than direct persistence knowledge
- Current dashboard UX prefers lightweight secondary surfaces over standalone admin pages, so delivery diagnostics should follow the same pattern

### Integration Points
- Native notification support will need a Tauri plugin or platform bridge added to the current native composition root in src-tauri/src/lib.rs
- Occurrence actions will likely require a persisted pending-occurrence model or log distinct from reminder definitions and scheduler_state
- Delivery health UI should read from a typed native snapshot that summarizes permission state, pending delivery problems, and recent action outcomes without forcing the frontend to inspect native logs directly

</code_context>

<deferred>
## Deferred Ideas

- Full reminder history timeline, missed-event review, and outcome browsing — Phase 4
- Dedicated settings page, launch-at-login, and app preference management — Phase 4 unless a minimal delivery prerequisite proves unavoidable
- Analytics or trends about completion, snooze habits, or missed reminders — future work after Phase 4
- Menu-bar or tray-first reminder control — future milestone

</deferred>

---
*Phase: 03-native-delivery*
*Context gathered: 2026-03-23*