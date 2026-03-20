---
phase: 02
slug: scheduling-engine
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-20
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Rust `cargo test` plus Vitest 4 with Testing Library |
| **Config file** | existing Vitest config in `vite.config.ts`; Rust unit tests in `src-tauri` |
| **Quick run command** | `cd src-tauri && cargo test` |
| **Full suite command** | `cd src-tauri && cargo test && cd .. && pnpm vitest run && pnpm build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd src-tauri && cargo test`
- **After every plan wave:** Run `cd src-tauri && cargo test && cd .. && pnpm vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | SCHD-03 | Rust domain unit | `cd src-tauri && cargo test active_window` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | SCHD-03, SCHD-04 | Rust repository unit | `cd src-tauri && cargo test scheduler_state_repository` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | DELV-04 | Rust runtime unit | `cd src-tauri && cargo test scheduler_runtime` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | SCHD-03 | Schema validation test | `pnpm vitest run src/features/reminders/form/reminder-form-schema.test.ts` | ✅ | ⬜ pending |
| 02-02-02 | 02 | 2 | SCHD-04 | React component test | `pnpm vitest run src/features/reminders/components/SchedulerControlStrip.test.tsx -t "pauses reminders"` | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 2 | SCHD-03 | React component test | `pnpm vitest run src/features/reminders/components/ReminderDrawer.test.tsx -t "active window"` | ✅ | ⬜ pending |
| 02-03-01 | 03 | 3 | DELV-04 | Rust reconciliation unit | `cd src-tauri && cargo test reconcile_gap` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 3 | DELV-04 | Rust integration unit | `cd src-tauri && cargo test lifecycle_recovery` | ❌ W0 | ⬜ pending |
| 02-03-03 | 03 | 3 | DELV-04, SCHD-04 | React component test | `pnpm vitest run src/app/AppShell.scheduler.test.tsx -t "refreshes after scheduler invalidation"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src-tauri/src/domain/scheduler.rs` test modules — quiet-hours, active-window, pause, and catch-up semantics
- [ ] `src-tauri/src/runtime/scheduler.rs` test modules — due-queue rebuild and invalidation behavior
- [ ] `src-tauri/src/runtime/lifecycle.rs` test modules — relaunch and short-gap reconciliation behavior
- [ ] `src-tauri/src/persistence/scheduler_state.rs` test modules — singleton scheduler-state persistence
- [ ] `src/features/reminders/components/SchedulerControlStrip.test.tsx` — quiet-hours and pause-all UI behavior coverage
- [ ] `src/features/reminders/components/QuietHoursTile.test.tsx` or equivalent coverage under strip tests — explicit save and validation coverage
- [ ] `src/app/AppShell.scheduler.test.tsx` — scheduler invalidation triggers reminder and snapshot refetch coverage

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashboard 顶部控制区仍保持 calm 而非 admin-console 感 | SCHD-03, SCHD-04 | 视觉密度与语气无法完全靠自动化断言 | 运行应用，检查 scheduler control strip 没有压过 hero card 和主 CTA，且状态文案保持轻量 |
| Quiet hours 跨夜编辑语义清晰 | SCHD-03 | 需要确认用户能直观看懂 22:00–08:00 这类范围 | 在 dashboard 顶部打开 quiet-hours 面板，设置跨夜时间，确认帮助文案与保存反馈清晰 |
| 短缺口 catch-up 的主界面呈现不过度打扰 | DELV-04 | catch-up 文案强弱和位置需要人判断 | 模拟短时睡眠/重启后的恢复状态，确认 hero 或 row 只出现轻量 catch-up 提示且无批量爆发感 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending