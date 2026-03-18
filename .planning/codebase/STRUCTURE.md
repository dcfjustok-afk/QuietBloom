# Codebase Structure

**Analysis Date:** 2026-03-18

## Directory Layout

```text
[project-root]/
├── .planning/codebase/    # Architecture and codebase reference documents for GSD workflows
├── public/                # Static files served by Vite and available to the Tauri webview by path
├── src/                   # React + TypeScript frontend source code
├── src-tauri/             # Rust native host, Tauri config, capabilities, generated schemas, and build output
├── index.html             # Root HTML shell for the frontend
├── package.json           # Frontend package manifest and scripts
├── tsconfig.json          # Frontend TypeScript settings
├── tsconfig.node.json     # Node-side TypeScript settings for Vite config
└── vite.config.ts         # Vite dev/build configuration tuned for Tauri
```

## Directory Purposes

**public/:**
- Purpose: Hold static assets referenced by absolute path in the frontend.
- Contains: `public/tauri.svg` and `public/vite.svg`.
- Key files: `public/tauri.svg`, `public/vite.svg`

**src/:**
- Purpose: Hold the entire current frontend application.
- Contains: React entrypoint, one top-level component, one stylesheet, ambient Vite types, and imported local assets.
- Key files: `src/main.tsx`, `src/App.tsx`, `src/App.css`, `src/vite-env.d.ts`

**src/assets/:**
- Purpose: Hold assets imported through the module graph rather than served from `public/`.
- Contains: `src/assets/react.svg`.
- Key files: `src/assets/react.svg`

**src-tauri/:**
- Purpose: Hold the native desktop application source and Tauri project metadata.
- Contains: Cargo manifest, build script, runtime config, capability files, generated schemas, icons, Rust sources, and Cargo build output.
- Key files: `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/src/main.rs`, `src-tauri/src/lib.rs`

**src-tauri/src/:**
- Purpose: Hold Rust runtime source files.
- Contains: Thin binary entrypoint and shared library runtime entrypoint.
- Key files: `src-tauri/src/main.rs`, `src-tauri/src/lib.rs`

**src-tauri/capabilities/:**
- Purpose: Declare what the desktop window is allowed to access.
- Contains: Default capability file for the main window.
- Key files: `src-tauri/capabilities/default.json`

**src-tauri/gen/:**
- Purpose: Hold generated Tauri schema artifacts used by tooling and validation.
- Contains: JSON schemas under `src-tauri/gen/schemas/`.
- Key files: `src-tauri/gen/schemas/desktop-schema.json`, `src-tauri/gen/schemas/capabilities.json`

**src-tauri/target/:**
- Purpose: Hold Cargo build artifacts and incremental compilation output.
- Contains: Rust build caches, compiled dependencies, and debug artifacts.
- Key files: `src-tauri/target/debug/`

## Key File Locations

**Entry Points:**
- `index.html`: HTML document loaded first by the frontend runtime.
- `src/main.tsx`: React bootstrap entrypoint.
- `src/App.tsx`: Current single-screen UI entrypoint.
- `src-tauri/src/main.rs`: Native process entrypoint.
- `src-tauri/src/lib.rs`: Native runtime composition root and Tauri command registration point.

**Configuration:**
- `package.json`: Frontend scripts and JavaScript dependencies.
- `vite.config.ts`: Fixed Tauri-oriented Vite dev server configuration and file watching rules.
- `tsconfig.json`: Frontend compiler strictness and module settings.
- `tsconfig.node.json`: TypeScript settings for Node-executed config files.
- `src-tauri/tauri.conf.json`: Tauri app metadata, build hooks, window config, and bundling rules.
- `src-tauri/Cargo.toml`: Rust dependencies and crate layout.
- `src-tauri/build.rs`: Tauri build hook to generate required native metadata.

**Core Logic:**
- `src/App.tsx`: Current UI behavior and single invoke call.
- `src-tauri/src/lib.rs`: Current Rust command implementation and runtime assembly.

**Testing:**
- No test directories or test files are present in the current template state.

## Naming Conventions

**Files:**
- Frontend component and entry files use PascalCase or conventional entry names: `src/App.tsx`, `src/main.tsx`.
- Frontend styles are colocated by component/root concern: `src/App.css`.
- Rust entry files use conventional crate names: `src-tauri/src/main.rs`, `src-tauri/src/lib.rs`.
- Config files use tool-default names: `vite.config.ts`, `tsconfig.json`, `src-tauri/tauri.conf.json`.

**Directories:**
- Frontend uses short top-level directories with no feature segmentation yet: `src/`, `src/assets/`.
- Native side follows Tauri defaults: `src-tauri/src/`, `src-tauri/capabilities/`, `src-tauri/gen/`, `src-tauri/icons/`, `src-tauri/target/`.

## Where to Add New Code

**New Feature:**
- Primary code: Start in `src/` and split out of `src/App.tsx` into new modules once a feature needs its own state or UI.
- Tests: Not established yet; if frontend tests are introduced, create a consistent test location under `src/` or a dedicated test directory and keep it aligned with the chosen test runner.

**New Component/Module:**
- Implementation: Add React components under a new subtree inside `src/`, not inside `public/` and not inside `src-tauri/`.
- Native-backed feature logic: Add the frontend caller in `src/` and the corresponding Tauri command or plugin wiring in `src-tauri/src/`.

**Utilities:**
- Shared helpers: Create a dedicated shared area under `src/` when helpers appear; the current template does not yet define one.
- Native helpers: Create Rust modules under `src-tauri/src/` and re-export or compose them from `src-tauri/src/lib.rs`.

## Frontend/Backend Boundary in Structure

**Frontend Boundary:**
- `src/`, `public/`, `index.html`, `vite.config.ts`, `tsconfig.json`, and `package.json` belong to the webview-facing application and toolchain.

**Backend Boundary:**
- `src-tauri/src/`, `src-tauri/Cargo.toml`, `src-tauri/build.rs`, `src-tauri/tauri.conf.json`, and `src-tauri/capabilities/` belong to the native desktop host.

**Communication Seam:**
- The seam currently exists only between `src/App.tsx` and `src-tauri/src/lib.rs` through the `invoke("greet", { name })` call and the registered `greet` command.

## Special Directories

**.planning/codebase/:**
- Purpose: Store generated architecture/reference documentation for planning workflows.
- Generated: Yes, by GSD workflow actions.
- Committed: Yes, intended as project planning artifacts.

**src-tauri/gen/:**
- Purpose: Hold generated Tauri schemas.
- Generated: Yes.
- Committed: Yes.

**src-tauri/icons/:**
- Purpose: Hold bundle icon assets for desktop packaging.
- Generated: Template-provided assets, then user-maintained.
- Committed: Yes.

**src-tauri/target/:**
- Purpose: Hold Cargo build output.
- Generated: Yes.
- Committed: No in normal practice, even if present locally in the workspace.

## Template State and Extension Points

**Current Template State:**
- The structure is still close to the stock Tauri + React starter layout.
- The frontend has not yet been decomposed into routes, components, features, hooks, services, or state modules.
- The native side has not yet been decomposed into domain modules, adapters, persistence code, or background task workers.

**Recommended Extension Points:**
- Break `src/App.tsx` apart first when adding real product UI.
- Keep `src/main.tsx` as a stable bootstrap file; do not overload it with feature logic.
- Keep `src-tauri/src/main.rs` thin and continue using `src-tauri/src/lib.rs` as the composition root.
- Add new Rust modules alongside `src-tauri/src/lib.rs` for commands, services, storage, or integrations when native responsibilities grow.
- Expand `src-tauri/capabilities/` whenever new plugins or privileged native operations are introduced.
- Treat `src-tauri/gen/` and `src-tauri/target/` as generated/output areas, not hand-authored business logic locations.

---

*Structure analysis: 2026-03-18*