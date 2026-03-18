# Coding Conventions

**Analysis Date:** 2026-03-18

## Naming Patterns

**Files:**
- React component files use PascalCase when the file represents a component or paired stylesheet, as in `src/App.tsx` and `src/App.css`.
- Frontend entry files use lowercase names for bootstrap concerns, as in `src/main.tsx`.
- Rust crate entry files follow Rust defaults with lowercase filenames, as in `src-tauri/src/main.rs` and `src-tauri/src/lib.rs`.

**Functions:**
- Frontend functions and handlers use camelCase, such as `greet`, `setGreetMsg`, and `setName` in `src/App.tsx`.
- Rust functions follow Rust-compatible lowercase naming in the current code, such as `greet` and `run` in `src-tauri/src/lib.rs`.

**Variables:**
- Local variables and React state values use camelCase, such as `greetMsg`, `name`, and `reactLogo` in `src/App.tsx`.
- CSS class names are short, lowercase selectors such as `.container`, `.row`, and `.logo` in `src/App.css`.

**Types:**
- No custom TypeScript interfaces, types, or enums are defined in `src/`.
- Type assertions are used inline at call sites, for example `document.getElementById("root") as HTMLElement` in `src/main.tsx`.

## Code Style

**Formatting:**
- No dedicated formatting config was detected: `.prettierrc*`, `prettier.config.*`, `biome.json`, `rustfmt.toml`, and `.rustfmt.toml` are absent from the workspace root.
- TypeScript formatting is inferred from source files such as `src/App.tsx`, `src/main.tsx`, and `vite.config.ts`: double quotes, semicolons, trailing commas in multiline expressions, and two-space indentation.
- Rust formatting is inferred from `src-tauri/src/lib.rs` and `src-tauri/src/main.rs`: four-space indentation and rustfmt-compatible layout, with no repository-specific override detected.

**Linting:**
- No ESLint or Biome config was detected, and `package.json` does not define a dedicated lint script.
- TypeScript strictness is enforced through `tsconfig.json` instead of a standalone linter. Active compiler rules include `strict`, `noUnusedLocals`, `noUnusedParameters`, and `noFallthroughCasesInSwitch`.
- No Clippy configuration or Rust lint command is configured in `src-tauri/Cargo.toml` or workspace scripts.

## Import Organization

**Order:**
1. External package imports first, for example `react` and `@tauri-apps/api/core` in `src/App.tsx` and `src/main.tsx`.
2. Local asset or module imports next, such as `./assets/react.svg` and `./App`.
3. Side-effect stylesheet imports last, as shown by `import "./App.css";` in `src/App.tsx`.

**Path Aliases:**
- No path aliases are configured in `tsconfig.json`.
- Frontend modules use relative imports only, such as `./App` and `./assets/react.svg`.

## Error Handling

**Patterns:**
- Frontend async work is handled inline with `await`, but there is no `try/catch` around `invoke("greet", { name })` in `src/App.tsx`.
- UI code does not expose loading, error, or retry state for Tauri command failures in `src/App.tsx`.
- Rust startup failure is handled with `.expect("error while running tauri application")` in `src-tauri/src/lib.rs`, which aborts on initialization errors.
- The Tauri command `greet` returns `String` directly in `src-tauri/src/lib.rs`; no `Result`-based command error contract is established.

## Logging

**Framework:** None detected.

**Patterns:**
- No `console.*` logging is present in `src/`.
- No structured logging crate is configured in `src-tauri/Cargo.toml`.
- Diagnostics currently rely on framework defaults and startup panic text from `src-tauri/src/lib.rs`.

## Comments

**When to Comment:**
- Comments are sparse and mostly inherited from scaffolded files, for example in `src/App.tsx`, `vite.config.ts`, and `src-tauri/src/main.rs`.
- Business logic is simple enough that the current codebase does not rely on explanatory comments.

**JSDoc/TSDoc:**
- Not used in `src/`.
- Rust doc comments are also not used in `src-tauri/src/`.

## Function Design

**Size:**
- Functions are small and localized. `App` and `greet` in `src/App.tsx` and `run` in `src-tauri/src/lib.rs` are each single-purpose.

**Parameters:**
- Event handlers and command calls pass concrete values directly, for example `{ name }` in `src/App.tsx`.
- Rust command parameters are explicit and scalar, as in `fn greet(name: &str) -> String` in `src-tauri/src/lib.rs`.

**Return Values:**
- React components return JSX directly.
- Frontend helper logic mutates component state rather than returning values.
- Rust command functions currently return plain values rather than `Result` wrappers.

## Module Design

**Exports:**
- Frontend modules favor default export for the top-level React component, as in `export default App;` in `src/App.tsx`.
- Rust exposes a named public entrypoint `pub fn run()` from `src-tauri/src/lib.rs`, which is consumed by `src-tauri/src/main.rs`.

**Barrel Files:**
- Not used. No `index.ts` or equivalent re-export modules exist under `src/`.

## State Management

**Approach:**
- State is local to the only React component via `useState` in `src/App.tsx`.
- No global state library, React context, reducer pattern, or external client cache is present in `src/`.
- Backend state is not modeled; the only Tauri command in `src-tauri/src/lib.rs` is stateless.

## Dependency Management

**JavaScript/TypeScript:**
- Frontend dependencies are declared in `package.json`.
- No JavaScript lockfile was detected in the workspace root: `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, and `bun.lockb` are absent.
- `src-tauri/tauri.conf.json` uses `pnpm dev` and `pnpm build` in build hooks, so the intended frontend package manager is `pnpm` even though the lockfile is not committed.

**Rust:**
- Rust dependencies are declared in `src-tauri/Cargo.toml`.
- A Rust lockfile is present at `src-tauri/Cargo.lock`, so Rust dependency resolution is pinned.

---

*Convention analysis: 2026-03-18*
