---
phase: 01
slug: reminder-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Rust `cargo test` plus Vitest 4 with Testing Library |
| **Config file** | none yet — Wave 0 installs and configures Vitest |
| **Quick run command** | `cargo test` |
| **Full suite command** | `cargo test && pnpm vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cargo test`
- **After every plan wave:** Run `cargo test && pnpm vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | REMD-01, EXPR-03 | Rust repository unit | `cargo test reminder_repository::tests::create_and_list_multiple` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | SCHD-01, SCHD-02, REMD-03 | Rust domain unit | `cargo test domain::schedule::tests::computes_next_due` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 2 | REMD-01, REMD-02, REMD-03 | React component test | `pnpm vitest run src/features/reminders/components/ReminderDrawer.test.tsx -t "creates reminder"` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 2 | REMD-02 | React component test | `pnpm vitest run src/features/reminders/components/ReminderRow.test.tsx -t "edits toggles deletes"` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 3 | SCHD-01, SCHD-02 | Schema validation test | `pnpm vitest run src/features/reminders/form/reminder-form-schema.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-02 | 03 | 3 | REMD-03 | React component test | `pnpm vitest run src/features/reminders/components/NextReminderCard.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vite.config.ts` — add Vitest `test` section and test environment setup
- [ ] `package.json` — add `test` script for Vitest
- [ ] `src/features/reminders/form/reminder-form-schema.test.ts` — interval and fixed-time schema coverage
- [ ] `src/features/reminders/components/ReminderDrawer.test.tsx` — create, edit, and unsaved-change coverage
- [ ] `src/features/reminders/components/ReminderRow.test.tsx` — toggle and delete row interaction coverage
- [ ] `src/features/reminders/components/NextReminderCard.test.tsx` — next-due rendering coverage
- [ ] Rust test modules under `src-tauri/src/domain/`, `src-tauri/src/commands/`, and `src-tauri/src/persistence/`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashboard-first hierarchy feels clear at desktop width | REMD-03 | Visual hierarchy and density are subjective and tied to the approved UI-SPEC | Run the app in desktop mode, verify the top bar, Next Reminder Card, Today Overview Card, and reminder list match the approved hierarchy |
| Drawer preserves context behind edit flow | REMD-01, REMD-02 | Requires direct confirmation of layout continuity and unsaved-change behavior | Open New reminder, start editing, attempt to close, confirm unsaved-change prompt appears and the dashboard remains visible behind the drawer |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending