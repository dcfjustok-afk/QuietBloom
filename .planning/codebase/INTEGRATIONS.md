# External Integrations

**Analysis Date:** 2026-03-18

## APIs & External Services

**Current State:**
- No external HTTP API SDK, cloud SDK, payment SDK, analytics SDK, or AI provider SDK is imported from the application source in `src/` or `src-tauri/src/`.
- Current implementation is a local desktop app scaffold with frontend-to-Rust IPC only, centered on `invoke("greet")` in `src/App.tsx` and the `greet` command in `src-tauri/src/lib.rs`.
- Current external integration status: 当前未接入外部 API/数据库，仅有本地插件/系统能力。

**Local Platform Integrations:**
- Tauri core runtime - Provides desktop windowing, IPC, bundling, and WebView hosting through `src-tauri/src/main.rs`, `src-tauri/src/lib.rs`, and `src-tauri/tauri.conf.json`.
  - SDK/Client: `tauri` crate and `@tauri-apps/api`.
  - Auth: Not applicable.
- Tauri Opener plugin - Provides OS-level open/reveal behavior through `tauri_plugin_opener::init()` in `src-tauri/src/lib.rs`.
  - SDK/Client: `tauri-plugin-opener` and `@tauri-apps/plugin-opener`.
  - Auth: Not applicable.

## Data Storage

**Databases:**
- Not detected. No SQLite, PostgreSQL, MySQL, MongoDB, Redis, SurrealDB, or ORM client is declared in `package.json` or `src-tauri/Cargo.toml`.
- No database connection code is present in `src/` or `src-tauri/src/`.

**File Storage:**
- Local application bundle assets only, such as `public/vite.svg`, `public/tauri.svg`, and icons under `src-tauri/icons/`.
- No app-managed filesystem persistence is implemented in source code.

**Caching:**
- None detected.

## Authentication & Identity

**Auth Provider:**
- None.
- No OAuth, session, token, or identity provider integration is present in `src/`, `src-tauri/src/`, `package.json`, or `src-tauri/Cargo.toml`.

## Monitoring & Observability

**Error Tracking:**
- None detected. No Sentry, Bugsnag, Datadog, Rollbar, or equivalent dependency is configured.

**Logs:**
- Default development/build logs only from Vite, Cargo, and Tauri.
- No structured application logging library is configured in `src/` or `src-tauri/src/`.

## CI/CD & Deployment

**Hosting:**
- Desktop distribution via Tauri bundle output, configured in `src-tauri/tauri.conf.json`.
- Frontend assets are built locally into `dist` and packaged by the native app.

**CI Pipeline:**
- Not detected. No GitHub Actions workflow or other CI configuration was reviewed from the required tech-stack files.

## Environment Configuration

**Required env vars:**
- `TAURI_DEV_HOST` - Optional development override read by `vite.config.ts` for dev server host/HMR.
- No required secret env vars were detected in the reviewed source and config files.

**Secrets location:**
- Not detected.
- No `.env` or `.env.*` files were found at the project root during this audit.

## Webhooks & Callbacks

**Incoming:**
- None.
- No webhook endpoints, HTTP servers, or callback handlers exist in `src/` or `src-tauri/src/`.

**Outgoing:**
- None.
- No fetch client, HTTP client, or third-party callback integration is implemented in reviewed source files.

## Capability and Permission Surface

**Window Capability:**
- `src-tauri/capabilities/default.json` grants the `main` window `core:default` and `opener:default` only.
- This indicates the app currently exposes Tauri core functionality and the opener plugin to the main window, without additional filesystem, shell, dialog, or custom command scopes beyond the registered `greet` command.

**IPC Boundary:**
- Frontend calls Rust through `@tauri-apps/api/core` in `src/App.tsx`.
- Rust registers commands and plugins in `src-tauri/src/lib.rs`.
- No network boundary or remote service boundary is present in the current implementation.

---

*Integration audit: 2026-03-18*
