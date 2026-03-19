# Phase 1: Reminder Foundation - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the local reminder foundation for QuietBloom: users can create, edit, enable or disable, and delete multiple reminders; configure interval-based and fixed-time schedules; persist reminders locally; and see each reminder's next due state after relaunch. It does not include native notification delivery, snooze handling, pause-all behavior, or history timelines.

</domain>

<decisions>
## Implementation Decisions

### Main Surface Structure
- Phase 1 home screen should be dashboard-first rather than a dense list-first management screen
- The dashboard should emphasize today's overview plus the next upcoming reminder
- Reminder management still needs to be accessible from the main surface, but the first impression should feel like a calm daily control center rather than a raw admin table

### Reminder Creation and Editing Flow
- New reminder creation and editing should happen in a side drawer, not a modal or separate full page
- Drawer interactions should use explicit save rather than auto-save
- The list or dashboard context should remain visible while editing so users keep orientation during setup

### Schedule Editor Complexity
- The schedule editor should be preset-first in Phase 1, with advanced rules revealed progressively
- Built-in quick paths should include fixed intervals, fixed clock times, weekday-oriented shortcuts, and a fully custom path
- Phase 1 should support interval-based schedules and fixed-time schedules within the same product surface, but should not overload the first screen with every option at once

### Reminder Content Model
- Reminder items should use a type plus title plus description model in Phase 1
- Built-in default types should include hydration, standing, stretching, eye rest, and a fully custom option
- The type should help structure defaults and presentation, but users must still be able to customize the visible title and instruction text

### Claude's Discretion
- Exact dashboard visual hierarchy and component composition
- Whether type appears as icon, badge, segmented control, or both
- Exact preset labels and wording for interval and fixed-time shortcuts
- Validation copy, inline helper text, and empty-state messaging

</decisions>

<specifics>
## Specific Ideas

- The product should feel like a calm daily rhythm tool, not an operations dashboard
- The first screen should answer two questions immediately: what is my day looking like, and what is the next reminder
- Editing should feel lightweight enough that creating a reminder does not require context switching away from the dashboard
- Progressive disclosure is important: simple defaults first, richer configuration only when the user asks for it

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product scope
- .planning/PROJECT.md — product definition, constraints, and v1 boundaries
- .planning/REQUIREMENTS.md — exact Phase 1 requirement set and v1 traceability
- .planning/ROADMAP.md — Phase 1 goal, success criteria, and plan breakdown target
- .planning/STATE.md — current focus and active project concerns

### Research context
- .planning/research/SUMMARY.md — executive summary of stack, feature expectations, architecture, and pitfalls
- .planning/research/FEATURES.md — table-stakes reminder behaviors and v1 scope guidance
- .planning/research/ARCHITECTURE.md — reminder foundation build order and persistence-first architecture rationale
- .planning/research/STACK.md — recommended Tauri plugin and frontend library choices for this phase
- .planning/research/PITFALLS.md — timer, recovery, and scope pitfalls to avoid while planning

### Existing app baseline
- .planning/codebase/ARCHITECTURE.md — current Tauri template boundary between frontend and Rust
- .planning/codebase/STACK.md — current runtime and package-manager assumptions for the starter repo

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- src/App.tsx — current single-screen entrypoint that can be replaced by the Phase 1 dashboard shell
- src/App.css — current global app stylesheet and root visual defaults that will be replaced as the new UI system appears
- src-tauri/src/lib.rs — current Tauri command registration point and native composition root for future reminder persistence commands

### Established Patterns
- The codebase is still a near-default Tauri + React starter, so there are no meaningful domain abstractions to preserve yet
- Frontend-to-native communication already uses Tauri invoke calls, which should remain the baseline pattern as reminder commands are introduced
- Tauri capabilities are minimal today, so new native features in later phases will need explicit permission additions rather than implicit access

### Integration Points
- Phase 1 UI work will replace the template greet screen in src/App.tsx and likely split it into reminder-focused feature modules
- Phase 1 persistence and data contracts will expand src-tauri/src/lib.rs from a single demo command into the first real application service surface
- Local persistence choices made in Phase 1 must leave room for the Rust-owned scheduler planned in Phase 2

</code_context>

<deferred>
## Deferred Ideas

- Native desktop notifications and reminder actions such as snooze or complete — Phase 3
- Pause-all and quiet-hours runtime behavior — Phase 2
- Reminder history timeline and dashboard retrospection — Phase 4
- AI-generated reminder plans, cloud sync, analytics, and social features — future phases only

</deferred>

---
*Phase: 01-reminder-foundation*
*Context gathered: 2026-03-19*