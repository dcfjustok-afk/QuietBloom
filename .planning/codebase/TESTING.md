# Testing Patterns

**Analysis Date:** 2026-03-18

## Test Framework

**Runner:**
- Not detected for the frontend. No `vitest.config.*`, `jest.config.*`, `playwright.config.*`, or `cypress.config.*` files are present in the workspace root.
- Not detected for the Rust application code. No `#[cfg(test)]` modules or `#[test]` functions were found in `src-tauri/src/lib.rs` or `src-tauri/src/main.rs`.
- Config: Not applicable in the current repository state.

**Assertion Library:**
- Not detected in `package.json`.
- Rust would have access to the built-in test framework if tests were added, but none are committed today.

**Run Commands:**
```bash
# Current state
npm run build          # Type-checks and builds frontend, but does not run tests
cargo test             # Cargo default command exists conceptually, but no Rust tests are currently defined

# Recommended starting point
pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom
pnpm vitest
cargo test
```

## Test File Organization

**Location:**
- No `*.test.*` or `*.spec.*` files were found anywhere in the workspace.
- There is no dedicated test directory under `src/`, `src-tauri/`, or the repository root.

**Naming:**
- No naming convention is established yet because no test files are committed.

**Structure:**
```
Current state:
- No committed test tree

Recommended starting point:
- src/**/*.test.tsx        # React component and UI behavior tests
- src/**/*.test.ts         # Utility or hook tests if utilities are introduced later
- src-tauri/src/lib.rs     # Inline Rust unit tests in a cfg(test) module
```

## Test Structure

**Suite Organization:**
```typescript
// Not established in the current repository.
// Recommended frontend starting point:
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import App from "./App";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("App", () => {
  it("renders the greeting form", () => {
    render(<App />);
    expect(screen.getByPlaceholderText("Enter a name...")).toBeInTheDocument();
  });
});
```

**Patterns:**
- Setup pattern: Not established.
- Teardown pattern: Not established.
- Assertion pattern: Not established.
- Current verification relies on manual execution through `vite` and `tauri` scripts in `package.json`.

## Mocking

**Framework:** Not detected.

**Patterns:**
```typescript
// Not established in the current repository.
// Recommended when frontend tests are introduced:
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));
```

**What to Mock:**
- For initial frontend tests around `src/App.tsx`, mock `@tauri-apps/api/core` so UI behavior can be tested without launching the Tauri runtime.
- If more Tauri plugins are introduced later, mock plugin boundaries rather than browser rendering primitives.

**What NOT to Mock:**
- Do not mock simple DOM rendering behavior from React Testing Library.
- Do not mock the pure string-formatting behavior of `greet` in `src-tauri/src/lib.rs` once Rust unit tests are added.

## Fixtures and Factories

**Test Data:**
```typescript
// No fixtures or factories are committed.
// Recommended starting point for UI tests:
const defaultName = "Charlie";
```

**Location:**
- Not applicable in the current repository state.
- If tests are added, keep small fixtures close to `src/App.tsx` until shared test data actually emerges.

## Coverage

**Requirements:**
- None enforced. No coverage thresholds, scripts, or reports are configured in `package.json` or repository config files.

**View Coverage:**
```bash
# Not configured currently
pnpm vitest --coverage   # Recommended after Vitest is added
```

## Test Types

**Unit Tests:**
- Not used today for either `src/` or `src-tauri/src/`.
- Recommended first step: cover `src/App.tsx` rendering and submission behavior, then add Rust unit tests for `greet` in `src-tauri/src/lib.rs`.

**Integration Tests:**
- Not used today.
- No browser automation, IPC integration harness, or end-to-end smoke test is committed.

**E2E Tests:**
- Not used.
- No Playwright, Cypress, or Tauri-specific E2E harness is configured.

## Common Patterns

**Async Testing:**
```typescript
// Not established in the current repository.
// Recommended starting point for invoke-driven UI behavior:
await screen.findByText(/hello/i);
```

**Error Testing:**
```typescript
// Not established in the current repository.
// Recommended starting point once UI error handling exists:
await expect(invoke("greet", { name: "" })).rejects.toBeDefined();
```

## Recommended Starting Point

- Add a `test` script to `package.json` using Vitest so frontend checks become part of normal developer workflow.
- Add `@testing-library/react`, `@testing-library/jest-dom`, and `jsdom` for React component testing around `src/App.tsx`.
- Add a small `#[cfg(test)]` module to `src-tauri/src/lib.rs` to verify the `greet` command output with `cargo test`.
- Introduce error-state UI in `src/App.tsx` before writing negative-path frontend tests, because no error branch exists yet.

```rust
// Recommended Rust starting point in src-tauri/src/lib.rs
#[cfg(test)]
mod tests {
    use super::greet;

    #[test]
    fn greet_formats_message() {
        assert!(greet("Charlie").contains("Charlie"));
    }
}
```

---

*Testing analysis: 2026-03-18*
