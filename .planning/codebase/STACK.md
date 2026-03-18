# Technology Stack

**Analysis Date:** 2026-03-18

## Languages

**Primary:**
- TypeScript - Frontend application code in `src/App.tsx`, `src/main.tsx`, and compiler settings in `tsconfig.json`.
- Rust (Edition 2021) - Native desktop shell and command layer in `src-tauri/src/lib.rs`, `src-tauri/src/main.rs`, configured by `src-tauri/Cargo.toml`.

**Secondary:**
- CSS - UI styling in `src/App.css`.
- JSON - Build/runtime configuration in `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/capabilities/default.json`.
- HTML - Single frontend entry document in `index.html`.

## Runtime

**Environment:**
- Node.js runtime required for Vite/Tauri frontend commands invoked from `package.json` and `src-tauri/tauri.conf.json`.
- Rust/Cargo toolchain required for the Tauri native layer defined in `src-tauri/Cargo.toml`.
- Desktop WebView runtime supplied by Tauri 2 at application runtime.

**Package Manager:**
- Node package manager: `pnpm` is the expected command runner because `src-tauri/tauri.conf.json` uses `pnpm dev` and `pnpm build`.
- Node lockfile: missing. No `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, or `bun.lockb` detected at project root.
- Rust package manager: Cargo.
- Rust lockfile: present at `src-tauri/Cargo.lock`.

## Frameworks

**Core:**
- React 19 (`react`, `react-dom`) - UI rendering in `src/main.tsx` and `src/App.tsx`.
- Tauri 2 (`tauri` crate, `@tauri-apps/api`, `@tauri-apps/cli`) - Desktop shell, JS-to-Rust bridge, packaging, and local capability model in `src-tauri/Cargo.toml`, `package.json`, and `src-tauri/capabilities/default.json`.

**Testing:**
- Not detected. No Jest, Vitest, Playwright, Cypress, or test scripts are defined in `package.json`.

**Build/Dev:**
- Vite 7 (`vite`) - Frontend dev server and production bundling configured in `vite.config.ts`.
- TypeScript 5.8 (`typescript`) - Static type checking during `npm`/`pnpm` build via the `build` script in `package.json`.
- `@vitejs/plugin-react` - React integration for Vite in `vite.config.ts`.
- `tauri-build` - Rust build helper invoked by `src-tauri/build.rs`.

## Key Dependencies

**Critical:**
- `react` / `react-dom` - Core UI runtime for the frontend in `src/main.tsx`.
- `@tauri-apps/api` - Frontend IPC access; currently used for `invoke("greet")` in `src/App.tsx`.
- `tauri` - Native app runtime and command registration in `src-tauri/src/lib.rs`.
- `serde` / `serde_json` - Serialization support available to the Rust side via `src-tauri/Cargo.toml`.

**Infrastructure:**
- `@tauri-apps/cli` - Runs `tauri dev` / `tauri build` workflows from the root `package.json`.
- `tauri-plugin-opener` and `@tauri-apps/plugin-opener` - Local system opener integration registered in `src-tauri/src/lib.rs` and declared in both `src-tauri/Cargo.toml` and `package.json`.
- `@types/react` / `@types/react-dom` - Type definitions for frontend development.

## Configuration

**Environment:**
- Optional development host override via `process.env.TAURI_DEV_HOST` in `vite.config.ts`.
- No checked-in `.env` or `.env.*` files were detected at the project root.
- Desktop app identifier, product name, bundle targets, and window defaults live in `src-tauri/tauri.conf.json`.

**Build:**
- Frontend scripts are defined in `package.json`: `dev`, `build`, `preview`, `tauri`.
- Vite dev/build behavior is configured in `vite.config.ts`.
- TypeScript compiler behavior is configured in `tsconfig.json` and `tsconfig.node.json`.
- Tauri build orchestration is configured in `src-tauri/tauri.conf.json` and `src-tauri/build.rs`.
- Native crate metadata and dependencies live in `src-tauri/Cargo.toml`.
- Capability permissions for the main window live in `src-tauri/capabilities/default.json`.

## Build and Run Workflow

**Frontend only:**
- `package.json` script `dev` runs Vite.
- `package.json` script `build` runs `tsc && vite build`.
- `package.json` script `preview` runs Vite preview.

**Desktop app:**
- `package.json` script `tauri` delegates to the Tauri CLI.
- `src-tauri/tauri.conf.json` runs `pnpm dev` before `tauri dev` and expects the frontend at `http://localhost:1420`.
- `src-tauri/tauri.conf.json` runs `pnpm build` before packaging and consumes frontend output from `dist` via `frontendDist: "../dist"`.
- `vite.config.ts` pins the dev server to port `1420` and HMR port `1421` for Tauri development.

## Platform Requirements

**Development:**
- Node.js plus a package manager capable of running the root scripts in `package.json`.
- `pnpm` specifically, unless `src-tauri/tauri.conf.json` is changed.
- Rust/Cargo toolchain for building the native shell in `src-tauri`.
- Tauri development prerequisites for the host OS.

**Production:**
- Desktop bundle target only. `src-tauri/tauri.conf.json` sets `bundle.active` to `true` and `bundle.targets` to `all`.
- Bundle icons are sourced from `src-tauri/icons/`.

---

*Stack analysis: 2026-03-18*
