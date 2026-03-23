# Requirements: QuietBloom

**Defined:** 2026-03-19
**Core Value:** Users can set up and trust beautiful, low-friction reminders that fit their work rhythm.

## v1 Requirements

### Reminder Management

- [x] **REMD-01**: User can create multiple reminder items with a title, short instruction, and enabled state
- [x] **REMD-02**: User can edit, enable or disable, and delete an existing reminder item
- [x] **REMD-03**: User can view each reminder's next due time and current state from the main app surface

### Scheduling

- [x] **SCHD-01**: User can configure an interval-based reminder that repeats after a chosen duration
- [x] **SCHD-02**: User can configure a fixed-time reminder that repeats on selected weekdays at chosen times
- [x] **SCHD-03**: User can define an active window or quiet-hours rule so reminders only fire during intended parts of the day
- [x] **SCHD-04**: User can temporarily pause all reminders for a preset duration and have them resume automatically

### Delivery and Actions

- [ ] **DELV-01**: User receives a native desktop notification when a reminder becomes due
- [ ] **DELV-02**: User can snooze a due reminder and have the next due time update predictably
- [ ] **DELV-03**: User can mark a due reminder as complete or skip it without creating duplicate reminder events
- [x] **DELV-04**: User can trust reminders to recover sensibly after app relaunch, sleep or wake, or short downtime
- [ ] **DELV-05**: User can see when desktop notification permission or delivery health needs attention and how to recover it

### History and Experience

- [ ] **HIST-01**: User can review recent reminder outcomes including completed, snoozed, skipped, missed, and fired events
- [ ] **EXPR-01**: User can create or edit a reminder through a polished desktop form with simple defaults first and advanced options second
- [ ] **EXPR-02**: User can configure app-wide settings such as default snooze duration and launch-at-login behavior
- [x] **EXPR-03**: User's reminders and app settings persist locally across app restarts without needing an account

## v2 Requirements

### Templates and Intelligence

- **TMPL-01**: User can start from curated reminder templates such as hydration, eye-rest, and stretch routines
- **TMPL-02**: User receives adaptive reminder timing based on idle time or recent interaction patterns
- **AI-01**: User can generate reminder plans or wellness suggestions with AI assistance

### Analytics and Expansion

- **ANLT-01**: User can view trends, streaks, and summary analytics over time
- **SYNC-01**: User can sync reminder data across devices with an account
- **TRAY-01**: User can control reminders fully from a tray or menu-bar surface without opening the main window

## Out of Scope

| Feature | Reason |
|---------|--------|
| Account system and cloud sync in v1 | Local-first delivery is the priority and auth/sync would distort the first release |
| AI coaching or generated reminder plans in v1 | The product must prove the reminder foundation before layering intelligence on top |
| Full task manager or project planner features | QuietBloom is a rhythm and wellness reminder tool, not a task platform |
| Heavy analytics dashboards in v1 | Basic history is enough to validate usage before investing in reporting surfaces |
| Social challenges, leaderboards, or gamification | They add noise and complexity that conflict with the calm product direction |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REMD-01 | Phase 1 | Complete |
| REMD-02 | Phase 1 | Complete |
| REMD-03 | Phase 1 | Complete |
| SCHD-01 | Phase 1 | Complete |
| SCHD-02 | Phase 1 | Complete |
| EXPR-03 | Phase 1 | Complete |
| SCHD-03 | Phase 2 | Complete |
| SCHD-04 | Phase 2 | Complete |
| DELV-04 | Phase 2 | Complete |
| DELV-01 | Phase 3 | Pending |
| DELV-02 | Phase 3 | Pending |
| DELV-03 | Phase 3 | Pending |
| DELV-05 | Phase 3 | Pending |
| HIST-01 | Phase 4 | Pending |
| EXPR-01 | Phase 4 | Pending |
| EXPR-02 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-23 after 02-01 completion*