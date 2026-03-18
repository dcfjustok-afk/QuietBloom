# Architecture

**Analysis Date:** 2026-03-18

## Pattern Overview

**Overall:** Tauri shell + React single-page frontend + Rust command backend template

**Key Characteristics:**
- Frontend and desktop shell are split into two codebases: web UI in `src/` and native host in `src-tauri/`.
- The current application is still in template state: there is one React screen, one Rust command, and no domain modules, persistence layer, or routing.
- Cross-boundary communication is explicit and narrow: the frontend calls Rust through Tauri `invoke`, and Rust exposes commands through `tauri::command` plus `generate_handler!`.

## Layers

**Frontend UI Layer:**
- Purpose: Render the desktop web UI, collect user input, and initiate Tauri command calls.
- Location: `src/`
- Contains: React entrypoint in `src/main.tsx`, one top-level component in `src/App.tsx`, component-scoped stylesheet in `src/App.css`, and static asset imports in `src/assets/`.
- Depends on: `react`, `react-dom`, `@tauri-apps/api/core`, browser DOM, and static files served from `public/`.
- Used by: The Vite dev server and the Tauri webview configured from `src-tauri/tauri.conf.json`.

**Frontend Build Layer:**
- Purpose: Bundle and serve the React app for development and package it for Tauri production builds.
- Location: `vite.config.ts`, `index.html`, `tsconfig.json`, `tsconfig.node.json`, `package.json`
- Contains: Vite dev-server settings, TypeScript compile rules, root HTML mount point, and npm scripts.
- Depends on: Vite, TypeScript, React plugin, and environment variables injected by Tauri such as `TAURI_DEV_HOST`.
- Used by: `pnpm dev` / `vite` during development and `pnpm build` before desktop bundling, as referenced in `src-tauri/tauri.conf.json`.

**Native Host Layer:**
- Purpose: Bootstrap the desktop application process, create the Tauri runtime, register plugins, and expose Rust commands to the frontend.
- Location: `src-tauri/src/main.rs`, `src-tauri/src/lib.rs`
- Contains: Native process entrypoint, command definitions, `tauri::Builder`, plugin registration, and generated context startup.
- Depends on: `tauri`, `tauri-plugin-opener`, generated config/context, and Rust standard library.
- Used by: The compiled desktop binary launched through `cargo`/`tauri` commands.

**Desktop Capability and Packaging Layer:**
- Purpose: Define window permissions, desktop metadata, build hooks, bundle metadata, and generated Tauri schemas.
- Location: `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`, `src-tauri/gen/schemas/`
- Contains: Window title and size, frontend build hooks, app identifier, bundle icons, capability declarations, and generated schema artifacts.
- Depends on: Tauri CLI/build tooling.
- Used by: The Tauri runtime at startup and the packaging pipeline at build time.

## Data Flow

**UI Render Flow:**

1. `index.html` provides the `#root` mount node and loads `src/main.tsx`.
2. `src/main.tsx` creates a React root and renders `<App />` inside `React.StrictMode`.
3. `src/App.tsx` owns the current UI state and renders the template form, logos, and response message.

**Frontend-to-Rust Command Flow:**

1. The user submits the form in `src/App.tsx`.
2. The `greet` function in `src/App.tsx` calls `invoke("greet", { name })` from `@tauri-apps/api/core`.
3. Tauri routes that invoke call into the Rust command registered in `src-tauri/src/lib.rs`.
4. The `greet(name: &str) -> String` command returns a formatted string.
5. The React component stores the result in local state and re-renders the `<p>{greetMsg}</p>` output.

**Desktop Startup Flow:**

1. The native binary starts at `src-tauri/src/main.rs`.
2. `src-tauri/src/main.rs` delegates to `quietbloom_lib::run()` in `src-tauri/src/lib.rs`.
3. `run()` creates the default Tauri builder, installs `tauri-plugin-opener`, registers the `greet` handler, loads generated application context, and starts the runtime.
4. Tauri loads frontend content from `http://localhost:1420` in dev or `../dist` in packaged builds, as configured in `src-tauri/tauri.conf.json`.

**State Management:**
- Frontend state is local component state only, implemented with `useState` in `src/App.tsx`.
- There is no shared client store, routing state, backend persistence, or IPC event bus beyond the single command invocation path.

## Key Abstractions

**React Root:**
- Purpose: Isolate application bootstrap from application UI.
- Examples: `src/main.tsx`
- Pattern: Minimal render-only entrypoint that delegates all UI behavior to `App`.

**Template Screen Component:**
- Purpose: Act as the single screen, form controller, and Tauri caller in the starter app.
- Examples: `src/App.tsx`
- Pattern: Monolithic function component combining local state, event handling, invoke calls, and markup in one file.

**Tauri Command Surface:**
- Purpose: Define the boundary that the frontend may call into native Rust code.
- Examples: `src-tauri/src/lib.rs`
- Pattern: Annotated Rust functions with `#[tauri::command]`, registered in `tauri::generate_handler![...]`.

**App Runtime Builder:**
- Purpose: Centralize plugin wiring and application startup.
- Examples: `src-tauri/src/lib.rs`
- Pattern: One `run()` function that constructs `tauri::Builder::default()` and configures the whole native runtime.

## Entry Points

**Web Document Entry:**
- Location: `index.html`
- Triggers: Browser load in standalone Vite, or Tauri webview load in desktop mode.
- Responsibilities: Define the root DOM node and load `src/main.tsx`.

**React Runtime Entry:**
- Location: `src/main.tsx`
- Triggers: Module load from `index.html`.
- Responsibilities: Create the React root and mount the application component tree.

**Primary UI Entry:**
- Location: `src/App.tsx`
- Triggers: React render from `src/main.tsx`.
- Responsibilities: Render the current template UI, manage form state, and call the Rust command.

**Native Binary Entry:**
- Location: `src-tauri/src/main.rs`
- Triggers: Desktop process launch via `cargo tauri dev` or packaged app execution.
- Responsibilities: Provide the platform-specific binary entry and delegate to the library runtime.

**Native App Runtime Entry:**
- Location: `src-tauri/src/lib.rs`
- Triggers: `quietbloom_lib::run()` from `src-tauri/src/main.rs`.
- Responsibilities: Register plugins, expose commands, load Tauri context, and run the desktop application.

## Error Handling

**Strategy:** Minimal template-level handling with no typed error boundary on either side.

**Patterns:**
- Frontend command errors are not caught in `src/App.tsx`; a rejected `invoke` would bubble as an unhandled async error.
- Native startup errors terminate the app through `.expect("error while running tauri application")` in `src-tauri/src/lib.rs`.

## Cross-Cutting Concerns

**Logging:** Not implemented. There is no frontend logger, no Rust tracing setup, and no structured telemetry in `src/` or `src-tauri/src/`.

**Validation:** Minimal and implicit. The only current input is the uncontrolled text field in `src/App.tsx`, and the Rust command accepts any `&str` without validation.

**Authentication:** Not applicable in the current template state. No auth provider, identity model, session state, or permission gating exists beyond the default Tauri capability file in `src-tauri/capabilities/default.json`.

## Frontend/Backend Boundary

**Boundary Definition:**
- Everything in `src/` executes inside the webview and should stay web-safe and serializable when talking to Rust.
- Everything in `src-tauri/src/` executes natively and is the place for filesystem access, OS integration, background tasks, and future secure operations.

**Current Boundary Surface:**
- One invoke call from `src/App.tsx` to the `greet` command in `src-tauri/src/lib.rs`.
- One installed native plugin, `tauri-plugin-opener`, registered in `src-tauri/src/lib.rs` and permitted by `src-tauri/capabilities/default.json`.

**Expansion Guidance:**
- Add new UI-only features under `src/` until they need native access.
- Add new native capabilities as new `#[tauri::command]` functions or plugin wiring in `src-tauri/src/lib.rs`, then call them from frontend modules rather than expanding `src/App.tsx` indefinitely.
- Split the current monolithic template into feature modules before adding multiple screens, complex state, or persistent data.

## Template State and Future Extension Points

**Template State:**
- The project still matches the default Tauri + React starter shape with minimal customization: renamed package/app metadata in `package.json` and `src-tauri/tauri.conf.json`, Chinese window title in `src-tauri/tauri.conf.json`, and otherwise starter UI/code paths.
- There is no application domain model, service layer, repository layer, router, or multi-window setup.

**Future Extension Points:**
- Frontend feature modules can branch out from `src/App.tsx` into directories such as `src/components/`, `src/features/`, or `src/lib/` when the single-file UI becomes a bottleneck.
- Native command organization can move from a single `src-tauri/src/lib.rs` file to per-domain Rust modules, while keeping `run()` as the composition root.
- Additional windows, menu/tray behavior, CSP hardening, updater, and bundle configuration belong in `src-tauri/tauri.conf.json`.
- Additional permissions and plugin scopes belong in `src-tauri/capabilities/`.
- Generated schema files in `src-tauri/gen/schemas/` should remain generated artifacts, not hand-edited extension points.

---

*Architecture analysis: 2026-03-18*