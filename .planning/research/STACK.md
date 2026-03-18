# Technology Stack

**Project:** QuietBloom
**Research Focus:** Stack dimension for a desktop reminder and work-rhythm wellness app
**Researched:** 2026-03-18
**Overall Recommendation:** Keep the existing Tauri 2 + React 19 + TypeScript baseline, then add a Tauri-native local-first stack: native notifications, SQLite for reminder data, a tiny key-value store for preferences, Rust-side scheduling, and only a small amount of frontend library surface.

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tauri | 2.x current stable | Desktop shell, native capabilities, packaging, permissions | This is already the project baseline and remains the standard lightweight Rust-backed desktop shell in 2025 for teams that want native integration without Electron-class overhead. | HIGH |
| React | 19.x current stable | Desktop UI composition | Good fit for a settings-heavy reminder app with forms, panels, history views, and polished interaction work. Already present in the starter. | HIGH |
| TypeScript | 5.8+ | Frontend type safety and app contracts | Necessary once reminder rules, notification payloads, and cross-layer data contracts stop being toy-sized. | HIGH |
| Vite | 7.x | Frontend dev/build pipeline | Already present, fast, and the normal pairing for Tauri + React. | HIGH |
| pnpm | current stable | Workspace package manager | The existing Tauri config already expects pnpm. Keep one package manager and stop drift early. | HIGH |

### Native/Desktop Layer

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @tauri-apps/plugin-notification | 2.x | Native desktop reminders | A reminder app without OS-native notifications is not credible. Tauri's notification plugin is first-party, desktop-supported, and permission-aware. | HIGH |
| @tauri-apps/plugin-sql + SQLite engine | 2.x | Structured local persistence for reminders, schedules, snoozes, completion history | SQLite is the right default for local-first desktop reminder data. The SQL plugin supports SQLite and migrations, which keeps schema evolution manageable. | HIGH |
| @tauri-apps/plugin-store | 2.x | Small preference storage | Use this for UI prefs only: onboarding completion, window/UI flags, sound preference, quiet-hours toggle. Do not store core reminder records here. | HIGH |
| @tauri-apps/plugin-window-state | 2.x | Persist window size and position | Polished desktop apps remember where and how the user left them. This is low-cost and high-value. | HIGH |
| tauri-plugin-single-instance | 2.x | Prevent duplicate app processes and duplicate reminder schedulers | A reminder app must not accidentally start two schedulers and double-fire notifications. This plugin is standard defensive desktop plumbing. | HIGH |
| @tauri-apps/plugin-autostart | 2.x | Launch on login, opt-in | For a reminder app, login launch is useful, but it should be user-controlled, not silently forced. Add the capability early, expose it as a setting. | HIGH |
| @tauri-apps/plugin-log | 2.x | Persistent logs for reminder-debugging and support | Reminder reliability issues are hard to debug without on-disk logs. Add this before shipping to outside users. | HIGH |

### Frontend Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| react-hook-form | 7.x current stable | Reminder editor forms | Use for reminder creation/editing screens, especially once interval rules, fixed times, snooze settings, and validation errors appear together. It is small and optimized for fewer re-renders. | HIGH |
| zod | 4.x | Schema validation and parsing | Use for validating reminder rule input, persisted payload decoding, and any Rust boundary payloads mirrored in TypeScript. | HIGH |
| @hookform/resolvers | current stable | Zod integration for forms | Add only alongside React Hook Form + Zod. This keeps validation definitions single-sourced. | MEDIUM |
| date-fns | 4.x | Date math, recurrence helpers, formatting | Use for UI-side display and lightweight date calculations. Its modular API and timezone support are a good fit for reminder UX. | HIGH |
| TanStack Router | 1.x | Typed routing when the app grows beyond one screen | Add only when the app clearly has multiple top-level surfaces such as Dashboard, Reminders, History, and Settings. Not needed on day one. | MEDIUM |

## Prescriptive Architecture Choices

### 1. Keep reminder scheduling on the Rust side

Use React for editing and displaying reminder data, but keep the actual reminder scheduling engine in the Tauri native layer.

Why:

- Webview timers are fine for UI updates, but they are the wrong trust boundary for a desktop reminder product.
- Native-side scheduling gives you better control over startup recovery, duplicate prevention, and notification dispatch.
- This also keeps the frontend simpler: the UI edits schedules, the native layer owns runtime reminder execution.

### 2. Split persistence by data shape

Use two storage tiers from the start:

- SQLite for reminders, schedules, snoozes, dismissals, and completion history.
- Store JSON for simple preferences and UI flags.

Why:

- Reminder data becomes relational quickly: recurrence rules, snooze state, last-fired timestamps, archived reminders, and history entries.
- Preferences do not need SQL overhead.
- Trying to keep all of this in a JSON store is the kind of shortcut that becomes a rewrite.

### 3. Use capability-scoped native permissions deliberately

Tauri 2 blocks dangerous plugin commands by default. Treat capability files as part of the app design, not as last-minute config.

For this product, the likely early permission surface is:

- notification:default
- sql:default plus sql:allow-execute
- store:default
- window-state:default
- autostart permissions if the feature is enabled
- log:default

Why:

- A reminder app touches the OS in meaningful ways.
- Tight capability scoping reduces accidental surface area and makes future reviews easier.

## What To Build With This Stack

### Core v1 stack

This is the standard 2025 answer for this product category on top of the existing baseline:

1. Tauri 2 + React 19 + TypeScript + Vite
2. Tauri Notification plugin for native reminders
3. Tauri SQL plugin with SQLite for domain data
4. Tauri Store plugin for preferences
5. Tauri Window State plugin for polish
6. Tauri Single Instance plugin to avoid duplicate reminder workers
7. Tauri Autostart plugin as an opt-in user setting
8. Tauri Log plugin for diagnostics
9. React Hook Form + Zod for reminder editors
10. date-fns for reminder display and scheduling-related UI formatting

### Optional but not day-one

| Technology | Recommendation | Why Not Day One |
|------------|----------------|-----------------|
| TanStack Router | Add when you have multiple real screens | The starter app does not need routing complexity until navigation actually exists. |
| Updater plugin | Add when you are ready to distribute signed builds to external users | The updater requires signing keys, endpoint design, and release discipline. It is a shipping concern, not a reminder-core concern. |
| Tray/menu-bar behavior | Add if product design depends on “always available but unobtrusive” usage | Valuable, but only after reminder logic and notification trust are stable. |

## What NOT To Add In v1

| Category | Do Not Add | Why |
|----------|------------|-----|
| Server-state tooling | TanStack Query / React Query as a core dependency | This app is local-first and has no backend in v1. Query caching solves the wrong problem here. Use a small service layer over native commands instead. |
| Cloud/backend | Supabase, Firebase, custom API server, auth stack | Sync and accounts are explicitly out of scope. They would distort the roadmap and slow the core reminder experience. |
| Desktop shell replacement | Electron | Tauri already matches the project direction with lower overhead and stronger native/Rust integration. |
| JS ORM over local desktop DB | Prisma/Drizzle as a required v1 foundation | For a local Tauri app, the SQL plugin plus explicit migrations is enough. Adding a full ORM this early increases moving parts without solving the main reminder problem. |
| Secret storage | Stronghold or credential vault integration | v1 does not need to protect API tokens or user secrets because there is no account/cloud layer in scope. |
| Heavy global state layer | Redux Toolkit as a default | The app will start with local forms, settings, and a modest reminder list. This does not justify Redux overhead in v1. |
| AI/runtime agent stack | LLM features, embeddings, vector DB | Explicitly out of scope for v1 and likely to distract from reliability work. |

## Recommended Dependency Additions

### Tauri plugins

```bash
pnpm tauri add notification
pnpm tauri add sql
pnpm tauri add store
pnpm tauri add window-state
pnpm tauri add autostart
pnpm tauri add log

cd src-tauri
cargo add tauri-plugin-sql --features sqlite
cargo add tauri-plugin-single-instance
```

### Frontend libraries

```bash
pnpm add react-hook-form zod @hookform/resolvers date-fns
```

### Add later if the app shape justifies them

```bash
pnpm add @tanstack/react-router
pnpm tauri add updater
```

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Domain data storage | SQLite via Tauri SQL plugin | Store plugin only | JSON storage is fine for preferences, not for evolving reminder data and history. |
| Preference storage | Store plugin | SQLite for everything | SQL for tiny UI flags is unnecessary overhead and adds friction to simple settings work. |
| Reminder runtime | Rust-side scheduler + native notification dispatch | Webview-only timers + browser APIs | Browser-side timing is a weaker foundation for a desktop reminder tool that must earn trust. |
| Navigation | No router at first, TanStack Router once needed | Add a router immediately | Premature routing creates churn in a greenfield product that still has one-screen shape. |
| Async data layer | Direct command/service modules | TanStack Query everywhere | There is no remote server-state problem to justify it in v1. |

## Confidence Notes

| Area | Confidence | Notes |
|------|------------|-------|
| Tauri native plugins for notification, SQL, store, autostart, window-state, log | HIGH | Verified against current official Tauri v2 docs and plugin pages. |
| React Hook Form + Zod for form/validation | HIGH | Verified from official docs and matches current TypeScript-heavy React practice. |
| date-fns for date handling | HIGH | Verified from official site; modular and actively current with v4 timezone support. |
| TanStack Router as the default router if routing is later needed | MEDIUM | Official docs confirm maturity, but routing is not a day-one requirement for this product shape. |
| Lightweight client state beyond plain React state | MEDIUM | Ecosystem norm still favors lightweight stores, but this project can and should delay that decision until real cross-feature state appears. |

## Bottom Line

For a polished 2025 desktop reminder app built from this starter, the standard stack is not “add lots of web app infrastructure.” It is:

- Tauri-native desktop capabilities
- SQLite for durable reminder data
- a tiny settings store for preferences
- Rust-owned scheduling
- React form and validation libraries chosen for low ceremony
- minimal frontend state infrastructure until the app shape proves it needs more

That keeps v1 aligned with the product: trustworthy reminders, polished UX, and a small enough surface area to ship without building a fake SaaS inside a desktop shell.

## Sources

- Tauri v2 homepage: https://v2.tauri.app/
- Tauri Notifications plugin docs, last updated 2024-11-10: https://v2.tauri.app/plugin/notification/
- Tauri SQL plugin docs, last updated 2025-11-04: https://v2.tauri.app/plugin/sql/
- Tauri Store plugin docs, last updated 2025-11-10: https://v2.tauri.app/plugin/store/
- Tauri Window State plugin docs, last updated 2025-04-11: https://v2.tauri.app/plugin/window-state/
- Tauri Autostart plugin docs, last updated 2025-02-22: https://v2.tauri.app/plugin/autostart/
- Tauri Single Instance plugin docs, last updated 2025-11-03: https://v2.tauri.app/plugin/single-instance/
- Tauri Logging plugin docs, last updated 2025-07-03: https://v2.tauri.app/plugin/logging/
- Tauri Updater plugin docs, last updated 2025-11-28: https://v2.tauri.app/plugin/updater/
- React Hook Form official site: https://react-hook-form.com/
- Zod official docs: https://zod.dev/
- date-fns official site: https://date-fns.org/
- TanStack Query official docs: https://tanstack.com/query/latest
- TanStack Router official docs: https://tanstack.com/router/latest