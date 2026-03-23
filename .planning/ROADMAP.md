# Roadmap: QuietBloom

## Overview

QuietBloom v1 should ship as a local-first desktop reminder tool that users can trust throughout a normal workday. The roadmap therefore moves from durable reminder definitions, to scheduling correctness, to native delivery and actions, and only then to history, settings, and polish. This ordering protects the core value: beautiful reminders are only useful if they fire when they should and recover gracefully when desktop reality gets messy.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Reminder Foundation** - Build the local reminder model, persistence, and base authoring flows
- [ ] **Phase 2: Scheduling Engine** - Make reminder timing resilient, rule-driven, and recoverable
- [ ] **Phase 3: Native Delivery** - Deliver due reminders through desktop notifications and dependable action handling
- [ ] **Phase 4: Daily Experience** - Add history, settings, and polished day-to-day control surfaces

## Phase Details

### Phase 1: Reminder Foundation
**Goal**: Users can define multiple reminders with persisted local state and see when each one is next due.
**Depends on**: Nothing (first phase)
**Requirements**: [REMD-01, REMD-02, REMD-03, SCHD-01, SCHD-02, EXPR-03]
**Success Criteria** (what must be TRUE):
  1. User can create, edit, enable or disable, and delete multiple reminders from the desktop UI
  2. User can configure both interval-based and fixed-time schedules for a reminder
  3. App restart preserves reminder definitions and shows correct next-due information after relaunch
  4. Main surface lists reminders clearly enough to verify title, state, and next occurrence at a glance
**Plans**: 4 plans

Plans:
- [x] 01-01: Add Wave 0 test harness and native reminder persistence foundation
- [x] 01-02: Mirror reminder contracts and typed API wrappers in TypeScript
- [x] 01-03: Build dashboard-first CRUD shell and right-side drawer flows
- [x] 01-04: Add preset-first schedule editor and persisted next-due presentation

### Phase 2: Scheduling Engine
**Goal**: Reminder timing behaves predictably across quiet hours, pauses, and app lifecycle interruptions.
**Depends on**: Phase 1
**Requirements**: [SCHD-03, SCHD-04, DELV-04]
**Success Criteria** (what must be TRUE):
  1. User can define active windows or quiet hours and the app respects them when computing due reminders
  2. User can pause all reminders temporarily and they resume automatically at the expected time
  3. Relaunching the app or waking the machine does not lose reminder state, and overdue items are reconciled consistently
**Plans**: 3 plans

Plans:
- [x] 02-01: Implement Rust-side schedule compiler and due-queue runtime
- [ ] 02-02: Add quiet-hours, pause-all, and next-fire recalculation rules
- [ ] 02-03: Harden recovery for relaunch, sleep or wake, and overdue reconciliation

### Phase 3: Native Delivery
**Goal**: Due reminders reach the user through native notifications with dependable snooze, skip, and complete behavior.
**Depends on**: Phase 2
**Requirements**: [DELV-01, DELV-02, DELV-03, DELV-05]
**Success Criteria** (what must be TRUE):
  1. User receives a native desktop notification when a reminder becomes due
  2. User can snooze, skip, or complete a due reminder and the resulting state is reflected without duplicate events
  3. App surfaces notification permission or delivery issues with clear recovery guidance
  4. Delivery and action flows are logged well enough to debug reminder reliability problems
**Plans**: 3 plans

Plans:
- [ ] 03-01: Integrate native notification plugin, permission handling, and single-instance protection
- [ ] 03-02: Implement reminder occurrence actions for snooze, skip, complete, and dismissal semantics
- [ ] 03-03: Add delivery-health UI and diagnostic logging around notification flows

### Phase 4: Daily Experience
**Goal**: The app feels polished and informative enough for daily use, not just technically functional.
**Depends on**: Phase 3
**Requirements**: [HIST-01, EXPR-01, EXPR-02]
**Success Criteria** (what must be TRUE):
  1. User can review recent reminder history including fired, snoozed, skipped, completed, and missed outcomes
  2. User can create or edit reminders through a polished form that starts simple and reveals advanced options progressively
  3. User can adjust app-wide settings such as default snooze and launch-at-login from a dedicated settings surface
  4. The overall UI feels desktop-native, intentional, and stable on repeated daily use
**Plans**: 2 plans

Plans:
- [ ] 04-01: Build history and dashboard surfaces that expose current state and recent outcomes
- [ ] 04-02: Polish reminder editor, settings UX, and desktop-quality interaction details

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Reminder Foundation | 4/4 | Completed | 2026-03-20 |
| 2. Scheduling Engine | 1/3 | In Progress | - |
| 3. Native Delivery | 0/3 | Not started | - |
| 4. Daily Experience | 0/2 | Not started | - |