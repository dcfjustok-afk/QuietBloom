# Phase 1: Reminder Foundation - Research

**Researched:** 2026-03-19
**Domain:** Tauri 2 + React 19 local-first reminder foundation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Main Surface Structure
- Phase 1 home screen should be dashboard-first rather than a dense list-first management screen
- The dashboard should emphasize today's overview plus the next upcoming reminder
- Reminder management still needs to be accessible from the main surface, but the first impression should feel like a calm daily control center rather than a raw admin table

### Reminder Creation and Editing Flow
- New reminder creation and editing should happen in a side drawer, not a modal or separate full page
- Drawer interactions should use explicit save rather than auto-save
- The list or dashboard context should remain visible while editing so users keep orientation during setup

### Schedule Editor Complexity
- The schedule editor should be preset-first in Phase 1, with advanced rules revealed progressively
- Built-in quick paths should include fixed intervals, fixed clock times, weekday-oriented shortcuts, and a fully custom path
- Phase 1 should support interval-based schedules and fixed-time schedules within the same product surface, but should not overload the first screen with every option at once

### Reminder Content Model
- Reminder items should use a type plus title plus description model in Phase 1
- Built-in default types should include hydration, standing, stretching, eye rest, and a fully custom option
- The type should help structure defaults and presentation, but users must still be able to customize the visible title and instruction text

### Claude's Discretion
- Exact dashboard visual hierarchy and component composition
- Whether type appears as icon, badge, segmented control, or both
- Exact preset labels and wording for interval and fixed-time shortcuts
- Validation copy, inline helper text, and empty-state messaging

### Deferred Ideas (OUT OF SCOPE)
- Native desktop notifications and reminder actions such as snooze or complete — Phase 3
- Pause-all and quiet-hours runtime behavior — Phase 2
- Reminder history timeline and dashboard retrospection — Phase 4
- AI-generated reminder plans, cloud sync, analytics, and social features — future phases only
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REMD-01 | User can create multiple reminder items with a title, short instruction, and enabled state | Use one persisted reminders table, drawer form, and typed create/update commands |
| REMD-02 | User can edit, enable or disable, and delete an existing reminder item | Keep CRUD as command-driven mutations from React to Rust; separate save, toggle, and delete commands |
| REMD-03 | User can view each reminder's next due time and current state from the main app surface | Persist a materialized next_due_at read model with each reminder and return summary DTOs to the dashboard/list |
| SCHD-01 | User can configure an interval-based reminder that repeats after a chosen duration | Represent schedules as a discriminated union with interval config stored in schedule_json |
| SCHD-02 | User can configure a fixed-time reminder that repeats on selected weekdays at chosen times | Use the same discriminated union with fixed_time config using weekday arrays and minute-of-day values |
| EXPR-03 | User's reminders and app settings persist locally across app restarts without needing an account | Introduce SQLite in Phase 1 for reminder domain persistence; defer app settings store until settings actually exist |
</phase_requirements>

## Summary

Phase 1 should establish QuietBloom's durable reminder definition model, SQLite-backed persistence, and typed React-to-Rust command boundary. The current codebase is still the default Tauri starter: [src/App.tsx](src/App.tsx) is a demo screen, [src-tauri/src/lib.rs](src-tauri/src/lib.rs) exposes only a greet command, and [src-tauri/capabilities/default.json](src-tauri/capabilities/default.json) only grants `core` and `opener`. That means the correct Phase 1 plan is not to optimize an existing architecture; it is to replace the starter with the thinnest stable feature architecture that can survive Phase 2 scheduling work.

The strongest planning decision is to introduce SQLite now, but keep the schema intentionally small. Phase 1 does not need a full scheduler runtime, notification delivery, history stream, or app-wide settings surface. It does need durable reminder definitions, a persisted next-due read model, and a command-oriented boundary where Rust owns validation, persistence, and next-due computation while React owns layout, drawer form state, and optimistic refresh. That matches both Tauri's command model and the roadmap's dependency chain: persistence first, scheduler/runtime second, notification delivery third.

The smallest stable data model is one reminders table with a discriminated `schedule_json` payload and a materialized `next_due_at` column. This is materially better than storing reminders in Store/JSON files, and materially smaller than introducing separate schedule, state, history, and settings tables before those concerns are required. Planner should therefore keep Phase 1 scoped to: schema and contracts; CRUD dashboard/list/drawer; schedule editors plus next-due computation. Anything involving quiet hours, pause-all, background scheduler workers, notification plugins, or history entries is cross-phase leakage and should be explicitly blocked.

**Primary recommendation:** In Phase 1, add SQLite plus typed form/validation utilities now, keep all reminder domain writes behind Rust commands, persist one minimal reminder schema with `schedule_json` and `next_due_at`, and defer notification, store, runtime worker, and app settings concerns to later phases.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tauri | 2.x existing | Desktop shell and command/event boundary | Already present in the starter and the official command model is the stable React↔Rust integration point |
| React | 19.1.0 existing | Desktop UI composition | Already present and appropriate for dashboard plus drawer authoring flows |
| TypeScript | 5.8.3 existing | Typed UI and DTO contracts | Required once reminder schedules become structured payloads |
| @tauri-apps/plugin-sql | 2.3.2, verified 2026-02-03 | Standard Tauri SQL plugin wiring | Official plugin with SQLite support, migration support, and explicit capability model |
| tauri-plugin-sql with `sqlite` feature | version not registry-verified in this research; use current compatible 2.x | Rust-side SQLite access and migrations | Keeps persistence in the native layer and aligns with later Rust-owned scheduling |
| react-hook-form | 7.71.2, verified 2026-02-20 | Reminder drawer form state | Good fit for explicit save, dirty-state prompts, and nested schedule inputs with minimal rerenders |
| zod | 4.3.6, verified 2026-01-22 | Frontend input validation and DTO parsing | Best way to lock the discriminated schedule shape and keep validation logic coherent |
| @hookform/resolvers | 5.2.2, verified 2025-09-14 | RHF + Zod integration | Avoids duplicating validation rules between form code and schema code |
| date-fns | 4.1.0, verified 2024-09-17 | UI formatting of local times and next-due strings | Simple, modular, and explicitly not the source of truth for reminder scheduling |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 4.1.0, verified 2026-03-12 | Frontend unit/component tests | Add in Wave 0 because the repo currently has no test runner |
| @testing-library/react | 16.3.2, verified 2026-01-19 | Drawer/list/dashboard behavior tests | Use for user-facing form and list assertions |
| @testing-library/user-event | 14.6.1, verified 2025-01-21 | Interaction-level tests | Use for drawer open/edit/save/confirm flows |
| jsdom | 29.0.0, verified 2026-03-15 | Browser-like test environment for Vitest | Required once component tests are added |

### Now vs Later

| Item | Recommendation | Reason |
|------|----------------|--------|
| SQLite via SQL plugin | Add now | Phase 1 already requires durable reminder definitions and restart-safe next-due state |
| react-hook-form | Add now | The drawer is the core Phase 1 interaction and needs dirty tracking plus dynamic schedule fields |
| zod | Add now | Phase 1 already has a non-trivial discriminated schedule model that should not be validated ad hoc |
| @hookform/resolvers | Add now | Only because RHF + Zod are both recommended now |
| date-fns | Add now, UI-only | Needed for formatting and small local display helpers; do not use it as scheduling authority |
| @tauri-apps/plugin-store | Defer | No Phase 1 requirement needs a separate preferences store yet |
| @tauri-apps/plugin-notification | Defer to Phase 3 | Delivery is explicitly out of scope for Phase 1 |
| tauri-plugin-single-instance | Defer to Phase 3 | It matters once a background delivery/runtime worker exists |
| @tauri-apps/plugin-autostart | Defer to Phase 4 | Settings surface is not part of Phase 1 |
| @tauri-apps/plugin-window-state | Defer to Phase 4 | Nice polish, but not part of reminder foundation correctness |
| @tauri-apps/plugin-log | Defer to Phase 3 | Diagnostic logging becomes necessary when native delivery starts |
| Router library | Defer | Phase 1 is still a single-surface app |
| Global state library | Do not add | CRUD plus one drawer does not justify Redux/Zustand complexity yet |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SQLite now | Store/JSON file now, migrate later | Faster initial coding, but it creates a predictable rewrite before Phase 2/3 |
| react-hook-form + zod | Hand-rolled `useState` form and manual validation | Works for the first demo, degrades quickly once drawer reuse, presets, dirty state, and custom times arrive |
| Rust-owned command boundary | Frontend imports `@tauri-apps/plugin-sql` and writes DB directly | Fewer files initially, but it makes Phase 2 scheduler ownership harder and weakens domain validation |

**Installation now:**

```bash
pnpm tauri add sql
cd src-tauri
cargo add tauri-plugin-sql --features sqlite
cd ..
pnpm add react-hook-form zod @hookform/resolvers date-fns
pnpm add -D vitest @testing-library/react @testing-library/user-event jsdom
```

**Explicitly not now:**

```bash
# defer to later phases
pnpm tauri add store
pnpm tauri add notification
pnpm tauri add autostart
pnpm tauri add window-state
pnpm tauri add log
```

## Architecture Patterns

### Recommended Project Structure

```text
src/
├── app/
│   ├── AppShell.tsx          # dashboard-first shell replacing the starter screen
│   └── app.css               # token layer and app frame styles
├── features/
│   └── reminders/
│       ├── api/
│       │   └── reminders.ts  # typed invoke wrappers only
│       ├── components/
│       │   ├── NextReminderCard.tsx
│       │   ├── TodayOverviewCard.tsx
│       │   ├── ReminderListSection.tsx
│       │   ├── ReminderRow.tsx
│       │   └── ReminderDrawer.tsx
│       ├── form/
│       │   ├── reminder-form-schema.ts
│       │   └── reminder-form-defaults.ts
│       ├── model/
│       │   ├── reminder.ts
│       │   └── schedule.ts
│       └── utils/
│           └── reminder-display.ts
└── main.tsx

src-tauri/src/
├── lib.rs                    # composition root only
├── commands/
│   └── reminders.rs          # tauri commands and DTO mapping
├── domain/
│   ├── reminder.rs           # reminder entity and enums
│   └── schedule.rs           # schedule union and next-due computation
├── persistence/
│   └── reminders.rs          # repository over SQLite
└── db/
    └── migrations.rs         # migration registration
```

This is the right amount of evolution from the starter. It introduces one feature folder on the frontend and three native concerns on the Rust side: commands, domain, persistence. It does not introduce a router, global store, cross-feature shared UI kit, or generic service layers that do not have a second consumer yet.

### Pattern 1: Rust Commands as the Only Domain Boundary

**What:** React talks to Rust through typed `invoke()` wrappers only. React does not open the database itself.

**When to use:** For all reminder list, save, toggle, delete, and next-due operations in Phase 1.

**Example:**

```typescript
import { invoke } from '@tauri-apps/api/core';

export type ReminderSummary = {
  id: number;
  type: 'hydration' | 'standing' | 'stretching' | 'eye_rest' | 'custom';
  title: string;
  description: string | null;
  enabled: boolean;
  scheduleSummary: string;
  nextDueAt: string | null;
};

export async function listReminders(): Promise<ReminderSummary[]> {
  return invoke<ReminderSummary[]>('list_reminders');
}
```

Source: Tauri command system and module-splitting guidance in official docs, last updated 2025-11-19.

### Pattern 2: Discriminated Union Schedule Model

**What:** Represent schedule shape with a `kind` field and one payload shape per schedule mode.

**When to use:** Immediately in 01-01. Do not start with loose optional fields.

**Recommended model:**

```typescript
export const reminderTypeSchema = z.enum([
  'hydration',
  'standing',
  'stretching',
  'eye_rest',
  'custom',
]);

export const intervalScheduleSchema = z.object({
  kind: z.literal('interval'),
  everyMinutes: z.number().int().min(5).max(24 * 60),
  anchorMinuteOfDay: z.number().int().min(0).max(1439).default(540),
});

export const fixedTimeScheduleSchema = z.object({
  kind: z.literal('fixed_time'),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1),
  times: z.array(z.number().int().min(0).max(1439)).min(1),
});

export const scheduleSchema = z.discriminatedUnion('kind', [
  intervalScheduleSchema,
  fixedTimeScheduleSchema,
]);
```

Why this shape:
- `kind` makes Rust and TypeScript branching explicit.
- `minuteOfDay` avoids early timezone/string parsing churn inside the DB layer.
- `weekdays` and `times` already support presets and custom advanced entries.
- No quiet-hours, pause-all, snooze, or history fields are smuggled in early.

Source: Zod official docs for schema definition and discriminated parsing patterns.

### Pattern 3: Persist Definition Plus Materialized Next Due

**What:** Store the schedule definition and the already-computed `next_due_at` on the reminder row.

**When to use:** From the first migration.

**Recommended SQLite shape for Phase 1:**

```sql
CREATE TABLE reminders (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  schedule_kind TEXT NOT NULL,
  schedule_json TEXT NOT NULL,
  next_due_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_reminders_enabled_next_due ON reminders(enabled, next_due_at);
```

This is the minimal extensible schema for Phase 1. It is intentionally not split into `schedules`, `reminder_state`, and `history` yet. Those can appear when later phases actually need them.

### Anti-Patterns to Avoid

- **Direct SQL from React:** Even though the SQL plugin has JS bindings, using them for core reminder data weakens the Rust-owned boundary Phase 2 needs.
- **Loose optional schedule fields:** A shape like `{ intervalMinutes?: number, weekdays?: number[], times?: string[] }` makes invalid states too easy.
- **Designing quiet hours now:** Quiet hours are Phase 2 scope; do not add nullable columns or config objects for them in Phase 1.
- **Background scheduler worker now:** Phase 1 only needs command-time computation of `next_due_at`, not a long-lived due queue.
- **Separate settings store now:** There is no app settings surface in this phase. Keep the scope on reminder domain data.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Core reminder persistence | JSON file or browser localStorage contract | SQLite via Tauri SQL plugin | Schema evolution, filtering, ordering, and restart recovery become simpler and more reliable |
| Drawer form state | Custom nested `useState` tree | react-hook-form | Dirty state, reuse between create/edit, and dynamic schedule fields are already complex enough |
| Input validation | Inline if-else checks spread across components | Zod schemas | One source of truth for schedule shape and constraint messages |
| Time display formatting | Manual string building | date-fns in UI | Simpler local formatting, fewer edge-case bugs |
| Cross-layer domain writes | React calling database APIs directly | Tauri commands wrapping Rust repository logic | Keeps persistence and future runtime ownership in one place |

**Key insight:** Phase 1 should hand-roll neither storage nor form orchestration. It should hand-roll only the reminder domain rules that are product-specific: type defaults, schedule presets, and next-due calculation for two schedule modes.

## Common Pitfalls

### Pitfall 1: Letting Phase 2 Leak into the Phase 1 Schema

**What goes wrong:** The planner adds `quiet_hours`, `pause_until`, `recovery_policy`, `last_fired_at`, or notification-related columns because they look inevitable.

**Why it happens:** The roadmap is visible, so the team tries to “future proof” the first migration.

**How to avoid:** Restrict Phase 1 persistence to reminder authoring plus `next_due_at`. Anything about runtime suppression, delivery, reconciliation, or history stays out.

**Warning signs:** New columns appear that are not needed to satisfy REMD-01/02/03, SCHD-01/02, EXPR-03.

### Pitfall 2: Using Store Instead of SQLite for Reminder Data

**What goes wrong:** Reminder records are put into `store.json` or another key-value file because it feels lighter.

**Why it happens:** The starter is small and the team wants the first persisted version quickly.

**How to avoid:** Decide once in 01-01 that reminder data is domain data, not preferences. Use SQLite from the first persisted model.

**Warning signs:** Frontend code serializes full reminder arrays into one blob or capability changes mention only `store:default`.

### Pitfall 3: Making date-fns the Scheduling Authority

**What goes wrong:** React computes and persists `next_due_at`, while Rust becomes a thin storage proxy.

**Why it happens:** date-fns is convenient and already in the UI bundle.

**How to avoid:** Use date-fns only for rendering and helper formatting. Rust computes authoritative `next_due_at` before save and on list/load refresh.

**Warning signs:** `next_due_at` changes only when the drawer is open or after client-side effects run.

### Pitfall 4: Over-Normalizing the Database Too Early

**What goes wrong:** Phase 1 adds `reminders`, `schedules`, `interval_rules`, `fixed_time_rules`, `state`, `history`, and `settings` tables immediately.

**Why it happens:** The team designs for the whole roadmap instead of the phase boundary.

**How to avoid:** Keep one reminders table with typed schedule JSON now. Normalize later only when a concrete query or mutation requires it.

**Warning signs:** 01-01 becomes mostly schema plumbing instead of unlocking CRUD and schedule UI.

### Pitfall 5: Choosing Events When Commands Are Enough

**What goes wrong:** The frontend and Rust communicate through a custom event bus for CRUD flows.

**Why it happens:** Tauri exposes both commands and events, so teams over-generalize early.

**How to avoid:** In Phase 1, use commands for all request/response interactions. Events are for later runtime push cases, not form saves.

**Warning signs:** Save flows become harder to type, error handling becomes indirect, and tests need event timing coordination.

## Code Examples

Verified patterns from official sources and current project constraints:

### Rust Command Module Instead of Growing lib.rs

```rust
// src-tauri/src/commands/reminders.rs
use crate::domain::reminder::{ReminderDetail, SaveReminderInput};

#[tauri::command]
pub async fn save_reminder(input: SaveReminderInput) -> Result<ReminderDetail, String> {
    // repository + next-due calculation go here
    todo!()
}
```

```rust
// src-tauri/src/lib.rs
mod commands;
mod db;
mod domain;
mod persistence;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::reminders::list_reminders,
            commands::reminders::save_reminder,
            commands::reminders::delete_reminder,
            commands::reminders::set_reminder_enabled,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Source: Tauri official command docs, which explicitly recommend moving commands out of `lib.rs` when the app grows.

### RHF + Zod for Drawer Form

```typescript
const form = useForm<ReminderFormValues>({
  resolver: zodResolver(reminderFormSchema),
  defaultValues,
  mode: 'onBlur',
});

const scheduleKind = form.watch('schedule.kind');
const isDirty = form.formState.isDirty;
```

Why this exact pattern:
- `isDirty` supports the explicit unsaved-changes confirmation required by the UI contract.
- `watch('schedule.kind')` supports preset-first progressive disclosure without custom reducers.
- The same form shell can power create and edit flows.

Source: React Hook Form API and Zod official docs.

### date-fns for Display Only

```typescript
import { format, isToday, isTomorrow } from 'date-fns';

export function formatNextDue(value: string | null): string {
  if (!value) return 'No upcoming time';
  const date = new Date(value);
  if (isToday(date)) return `Today at ${format(date, 'HH:mm')}`;
  if (isTomorrow(date)) return `Tomorrow at ${format(date, 'HH:mm')}`;
  return format(date, 'EEE HH:mm');
}
```

Source: date-fns official docs for immutable formatting helpers.

## Data Model Recommendation

### Reminder Type

Use a closed enum in Phase 1:

```text
hydration | standing | stretching | eye_rest | custom
```

Do not make type fully user-defined yet. The requirement and UI contract both assume a stable built-in type set plus a custom fallback.

### Reminder Entity

Recommended minimum contract:

```typescript
type Reminder = {
  id: number;
  type: 'hydration' | 'standing' | 'stretching' | 'eye_rest' | 'custom';
  title: string;
  description: string | null;
  enabled: boolean;
  schedule: IntervalSchedule | FixedTimeSchedule;
  nextDueAt: string | null;
  createdAt: string;
  updatedAt: string;
};
```

### Interval Schedule

Recommended minimum contract:

```typescript
type IntervalSchedule = {
  kind: 'interval';
  everyMinutes: number;
  anchorMinuteOfDay: number;
};
```

Rationale:
- `everyMinutes` is the actual recurrence input.
- `anchorMinuteOfDay` gives a deterministic local-day reference without importing quiet-hours semantics.
- No `activeWindow`, `pauseUntil`, `lastFiredAt`, or `catchUpStrategy` belongs here yet.

### Fixed-Time Schedule

Recommended minimum contract:

```typescript
type FixedTimeSchedule = {
  kind: 'fixed_time';
  weekdays: number[];
  times: number[];
};
```

Rationale:
- `weekdays` supports weekday-oriented shortcuts from the UI spec.
- `times` as minute-of-day values supports one or multiple daily times without string parsing in the DB layer.
- This is already enough for “Weekdays 10:30”, “Weekdays 15:00”, and “Weekdays 10:30 + 15:00”.

### What Not to Add to the Model in Phase 1

- No notification payload state
- No snooze or completion fields
- No global pause fields
- No quiet-hours or active-window rules
- No history or occurrence tables
- No per-reminder diagnostics fields

## Frontend/Native Boundary Recommendation

### Stable Boundary

React should own:
- dashboard composition
- list rendering and sorting presentation
- drawer open/close state
- form state, helper text, and validation messages
- display formatting via date-fns

Rust should own:
- reminder DTO validation after crossing the Tauri boundary
- SQLite migrations and repository operations
- authoritative next-due computation
- normalization of schedule payloads before persistence
- future compatibility with the Phase 2 scheduler

### Recommended Command Surface

Phase 1 only needs these commands:

```text
list_reminders() -> ReminderSummary[]
get_reminder(id) -> ReminderDetail
save_reminder(input) -> ReminderDetail
delete_reminder(id) -> ()
set_reminder_enabled(id, enabled) -> ReminderSummary
```

This is enough. Do not add event streams, background worker controls, or notification commands in this phase.

### Why This Is the Most Stable Split

- It preserves Tauri's strongest official integration path: typed commands returning serializable values.
- It prevents the frontend from becoming the owner of schedule persistence.
- It lets Phase 2 add a runtime scheduler behind the same repository and domain modules without rewriting the UI contract.
- It keeps [src-tauri/src/lib.rs](src-tauri/src/lib.rs) as a composition root instead of letting it become a 500-line command dump.

## SQLite Conclusion

**Conclusion:** Introduce SQLite in Phase 1.

**Reason:** Phase 1 already needs durable multi-record reminder data, typed schedule payloads, sorting by next due, editing/deleting specific records, and correct state after relaunch. This is exactly the local application storage case SQLite is designed for. Official SQLite guidance is explicit that SQLite is a strong fit for local application data and for replacing ad hoc disk files; Tauri's official SQL plugin also supports SQLite, migrations, and explicit capabilities.

**Why not Store first:** Tauri Store is a persistent key-value store. It is appropriate for preferences and small document-like settings, but not the best authority for an evolving reminder domain with ordering, filtering, and future scheduler ownership. Using Store first would create avoidable migration churn before Phase 2.

**Phase 1 scope-safe interpretation:** SQLite now does not mean Phase 1 should build the full scheduler runtime. It only means the reminder domain should start on the right persistence foundation.

## Library Decisions

### react-hook-form

**Recommendation:** Use in Phase 1.

**Why:** The drawer is the primary authoring surface, and the UI contract explicitly requires explicit save plus unsaved-change confirmation. RHF gives dirty-state tracking, controlled integration points, and dynamic form sections without introducing a global state library.

**Do not use it for:** app-wide shared state, list state, or remote data orchestration.

### zod

**Recommendation:** Use in Phase 1.

**Why:** The schedule model is already a discriminated union. Zod is the right place to define the exact Phase 1 contract and prevent invalid mixed states such as interval plus weekdays fields on the same payload.

**Do not use it for:** replacing Rust-side validation. Rust still validates persisted inputs as the authority.

### date-fns

**Recommendation:** Use in Phase 1, but only for display formatting and tiny UI helpers.

**Why:** The dashboard and list must show next due times clearly. date-fns is a good lightweight fit for formatting local times and relative labels.

**Do not use it for:** authoritative recurrence computation, recovery policy, or background scheduling.

## Planner Guidance

### Recommended 3 Plan Boundaries

1. **01-01: Schema, persistence, and contracts**
   - Replace the starter greet architecture with Rust modules for commands/domain/persistence
   - Add SQLite plugin and first migration
   - Define shared reminder and schedule DTOs
   - Implement `list`, `get`, `save`, `delete`, `set_enabled`
   - Compute and persist `next_due_at` on save/update

2. **01-02: Dashboard shell and reminder CRUD flows**
   - Replace [src/App.tsx](src/App.tsx) with the dashboard-first shell from the UI contract
   - Build hero cards, reminder list, row actions, and drawer shell
   - Implement create/edit/delete/toggle flows against real persisted commands
   - Finish type/title/description/enabled interactions and unsaved-change confirmation

3. **01-03: Schedule editor and next-due read models**
   - Build preset-first interval and fixed-time editors inside the drawer
   - Add custom interval and custom weekday/time advanced inputs
   - Wire schedule summaries and next due display to persisted `next_due_at`
   - Add validation coverage for mixed/invalid schedule cases and list ordering by next due

### Dependency Order Between Plans

| Plan | Depends On | Why |
|------|------------|-----|
| 01-01 | nothing | Foundation plan |
| 01-02 | 01-01 | UI should bind to real commands and real persistence, not mocks |
| 01-03 | 01-01 and 01-02 | Schedule editor belongs inside the already-built drawer and should persist through the established contract |

### Hard Planning Boundaries

- 01-01 must not add quiet-hours, pause-all, notification delivery, or history tables.
- 01-02 must not invent a router, settings page, or tray/menu bar surface.
- 01-03 must not create a background scheduler worker or notification integration; it only computes and persists next due in the authoring path.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Keep app logic in a single starter `App.tsx` and `lib.rs` | Split into small feature modules and command modules | Current Tauri guidance and app growth pattern | Prevents starter-file sprawl and makes native boundary maintainable |
| Persist local app data in blobs or settings files | Use SQLite for domain data, key-value store for preferences only | Long-standing desktop-local best practice; reaffirmed in current SQLite guidance | Reduces inevitable rewrite pressure |
| Let frontend own repeated timing logic | Keep authoritative timing-related computation in Rust | Matches Tauri command/state guidance and future scheduler roadmap | Protects Phase 2 from boundary reversal |
| Use UI libraries or router stacks immediately | Add only the smallest libraries that solve current form and validation needs | Current repo shape is single-surface | Avoids premature architecture |

**Deprecated or outdated for this phase:**
- Writing reminder domain data directly from React via SQL plugin guest bindings
- Starting with Store/JSON and promising to migrate “later”
- Designing reminder schema around quiet hours, pause-all, or notifications before those phases arrive

## Open Questions

1. **Which Rust datetime crate should implement next-due calculation?**
   - What we know: Phase 1 needs local-time weekday and minute-of-day computation in Rust.
   - What's unclear: Current crate choice was not registry-verified here because crates.io search timed out during research.
   - Recommendation: Resolve inside 01-01, keep it behind `domain/schedule.rs`, and do not leak the crate choice into frontend contracts.

2. **Should `next_due_at` stay on the reminders table in Phase 2, or move into a dedicated state table later?**
   - What we know: Keeping it on `reminders` is the smallest correct Phase 1 design.
   - What's unclear: Phase 2 runtime reconciliation may justify a dedicated state table.
   - Recommendation: Start on `reminders.next_due_at`; only split when a concrete Phase 2 query or write path requires it.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Rust `cargo test` for native domain/persistence + Vitest 4.1.0 with Testing Library for React |
| Config file | none currently — see Wave 0 |
| Quick run command | `cargo test && pnpm vitest run` |
| Full suite command | `cargo test && pnpm vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REMD-01 | create multiple reminders with title, description, enabled state | Rust repository unit + drawer component test | `cargo test reminder_repository::tests::create_and_list_multiple && pnpm vitest run src/features/reminders/components/ReminderDrawer.test.tsx -t "creates reminder"` | ❌ Wave 0 |
| REMD-02 | edit, toggle, delete existing reminder | Rust command test + row interaction test | `cargo test commands::reminders::tests::update_toggle_delete && pnpm vitest run src/features/reminders/components/ReminderRow.test.tsx -t "edits toggles deletes"` | ❌ Wave 0 |
| REMD-03 | show next due time and current state on main surface | next-due unit test + dashboard rendering test | `cargo test domain::schedule::tests::computes_next_due && pnpm vitest run src/features/reminders/components/NextReminderCard.test.tsx` | ❌ Wave 0 |
| SCHD-01 | configure interval reminder | schedule validation test | `cargo test domain::schedule::tests::interval_schedule && pnpm vitest run src/features/reminders/form/reminder-form-schema.test.ts` | ❌ Wave 0 |
| SCHD-02 | configure fixed-time reminder on weekdays and times | schedule validation test | `cargo test domain::schedule::tests::fixed_time_schedule && pnpm vitest run src/features/reminders/form/reminder-form-schema.test.ts -t "fixed time"` | ❌ Wave 0 |
| EXPR-03 | data persists across app restarts | repository integration test | `cargo test persistence::reminders::tests::persists_and_reloads` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `cargo test`
- **Per wave merge:** `cargo test && pnpm vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `vite.config.ts` — add Vitest `test` section and types reference
- [ ] `src/features/reminders/form/reminder-form-schema.test.ts` — schedule schema coverage for interval/fixed-time
- [ ] `src/features/reminders/components/ReminderDrawer.test.tsx` — create/edit/unsaved-change flow coverage
- [ ] `src/features/reminders/components/ReminderRow.test.tsx` — toggle/delete row interactions
- [ ] `src/features/reminders/components/NextReminderCard.test.tsx` — next due display formatting coverage
- [ ] Rust test modules under `src-tauri/src/domain/`, `src-tauri/src/commands/`, `src-tauri/src/persistence/`
- [ ] `package.json` — add `test` script for Vitest

## Sources

### Primary (HIGH confidence)

- Tauri official docs, Calling Rust from the Frontend: https://v2.tauri.app/develop/calling-rust/ — command modules, async commands, command/event split, updated 2025-11-19
- Tauri official docs, SQL plugin: https://v2.tauri.app/plugin/sql/ — SQLite support, migrations, permissions, updated 2025-11-04
- Tauri official docs, Store plugin: https://v2.tauri.app/plugin/store/ — key-value storage behavior and permissions, updated 2025-11-10
- Tauri official docs, Using Plugin Permissions: https://v2.tauri.app/learn/security/using-plugin-permissions/ — capability editing model, updated 2025-02-22
- Tauri official docs, State Management: https://v2.tauri.app/develop/state-management/ — managed state patterns and mutex guidance, updated 2025-05-07
- SQLite official guidance: https://www.sqlite.org/whentouse.html — local application storage guidance, updated 2025-05-31
- React Hook Form official docs: https://react-hook-form.com/docs
- Zod official docs: https://zod.dev/
- date-fns official docs: https://date-fns.org/
- Vitest official guide: https://vitest.dev/guide/

### Secondary (MEDIUM confidence)

- npm registry queries run on 2026-03-19 for current versions and publish timestamps of `@tauri-apps/plugin-sql`, `@tauri-apps/plugin-store`, `react-hook-form`, `@hookform/resolvers`, `zod`, `date-fns`, `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`
- Existing QuietBloom research docs: `.planning/research/STACK.md` and `.planning/research/ARCHITECTURE.md`

### Tertiary (LOW confidence)

- Rust datetime crate selection for next-due implementation; crates.io lookup timed out during research, so crate choice remains to be finalized in 01-01

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - driven by official Tauri, SQLite, RHF, Zod, date-fns, and Vitest docs plus current npm registry data
- Architecture: HIGH - strongly constrained by current starter shape, roadmap boundaries, and Tauri command/state patterns
- Pitfalls: HIGH - directly derived from the roadmap, UI contract, and persistence/runtime separation

**Research date:** 2026-03-19
**Valid until:** 2026-04-18