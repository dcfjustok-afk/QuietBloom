---
phase: 02
slug: scheduling-engine
status: draft
shadcn_initialized: false
preset: none
created: 2026-03-20
---

# Phase 02 — UI Design Contract

> Visual and interaction contract for QuietBloom Phase 2. This contract is prescriptive so planning and implementation can proceed without design ambiguity.

---

## Scope Anchors

Locked decisions carried forward from upstream artifacts and Phase 1:

- Preserve the dashboard-first shell, right-side drawer, explicit save, and restrained desktop-native tone established in Phase 1.
- Phase 2 adds scheduler control surfaces only where they naturally belong: a lightweight dashboard-top control area for app-wide behavior and an advanced drawer section for reminder-specific timing constraints.
- Global quiet hours and reminder-level active windows both apply. A reminder may trigger only when both conditions allow it.
- Quiet hours use local wall-clock semantics and must support cross-midnight ranges such as 22:00 to 08:00.
- When a reminder becomes due during quiet hours, the UI should frame the result as deferred to the next allowed moment, not skipped and not replayed in a burst.
- Pause-all uses four presets only: 30 minutes, 1 hour, 2 hours, and the rest of today.
- During pause-all, reminders do not accumulate for replay. When pause ends, the app recomputes from current rules.
- Recovery after relaunch, sleep, or wake remains scheduler behavior in Phase 2; the UI may explain the outcome lightly, but must not grow into a history or diagnostics surface.

Phase 2 is not allowed to expand into these deferred areas:

- Dedicated settings page or settings route
- Notification permission, delivery health, or native-notification troubleshooting
- Snooze, skip, complete, dismiss, or occurrence action UI
- History timeline, missed-event ledger, or replay audit views
- Dense admin-console treatment with many columns, charts, or status panels

Design tone:

- Calm, restrained, and quietly informative
- Desktop-native rather than web-app control center
- Protective rather than alarmist when showing suppression or recovery states

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | none in Phase 2 |
| Icon library | app-owned inline SVG icons |
| Font | SF Pro Text, SF Pro Display, PingFang SC, system-ui, sans-serif |

### Continuation Strategy

- Continue the local CSS custom-property token layer already established in [src/App.css](src/App.css).
- Reuse existing surface, border, text, accent, and danger tokens before adding any new scheduler-specific values.
- If Phase 2 needs additional tokens, they must be additive aliases such as a soft accent tint or a subdued warning border, not a new color family.
- Continue the existing component vocabulary from [src/app/AppShell.tsx](src/app/AppShell.tsx) and the reminder feature components rather than introducing a parallel settings surface or a separate design system.

### Why Phase 2 Still Should Not Use shadcn

- The repository still has no Tailwind, no PostCSS, and no components.json, so introducing shadcn here would create infrastructure churn unrelated to scheduling semantics.
- Phase 2 only extends two existing surfaces: the dashboard header area and the existing reminder drawer. This is too small and too coupled to the current CSS token layer to justify registry setup.
- Avoiding shadcn also keeps registry safety simple for this phase: no third-party block ingestion and no new component-source review burden.

---

## Layout Contract

### App Frame

- Keep the single-window desktop frame from Phase 1: 1120px max content width, 24px outer padding, and a 64px top bar baseline.
- Do not add a new route, left navigation, or settings sub-surface.
- Phase 2 inserts one new horizontal layer between the top bar and the hero row: the scheduler control strip.
- The Phase 1 top-bar status copy should step down to a neutral day-summary line; app-wide scheduler state must live primarily in the scheduler control strip rather than being duplicated in the top bar.

### Scheduler Control Strip

Purpose:

- Give the user one calm place to understand and adjust app-wide timing constraints without turning the dashboard into a control console.

Placement and size:

- Position directly under the existing top bar identity block and above the hero row.
- Vertical gap from top bar to strip: 16px.
- Vertical gap from strip to hero row: 24px.
- Use one shared secondary-surface container rather than multiple floating widgets.
- Minimum height: 72px.
- Horizontal layout on desktop: left summary cluster, right action cluster.
- On narrower widths, the strip may wrap into two rows, but it must remain one visual unit.

Contents:

1. Quiet hours summary tile
2. Pause-all control tile
3. One shared runtime state note when the app is presently paused, inside quiet hours, or resuming from a short-gap catch-up

Visual rules:

- The strip must read as a utility tray, not a hero banner.
- Use the secondary surface and soft border treatment; avoid full accent backgrounds across the strip.
- The top-right New reminder CTA remains the primary call to action for the page.
- Quiet hours and pause controls should feel adjacent to the dashboard identity, not like a separate settings module.
- App-wide runtime state must have one primary home in this strip. Today Overview may echo one short fact secondarily, but the top bar and hero must not duplicate the same primary state summary.

### Quiet Hours Tile

Required content:

- Label: Quiet hours
- Current summary when enabled, for example 22:00–08:00
- Current state line: Allowed now or Quiet until 08:00
- Edit affordance that opens a compact inline popover or anchored panel

Editing container:

- Use a compact popover or anchored panel, not a full drawer and not a full-page settings view.
- Width target: 320px to 360px.
- Fields: enabled toggle, start time, end time.
- Helper copy must explicitly explain cross-midnight behavior in plain language.

Editing rules:

- Save explicitly inside the panel.
- Do not use sliders or timeline visualizations.
- If start and end times are the same, show inline validation and block save.
- Closing the panel with unsaved changes should not silently discard edits; use the same explicit-save tone as Phase 1 and keep the draft open until the user saves or discards.

### Pause-All Tile

Required content when inactive:

- Label: Pause all
- Secondary summary: Pause reminders for a short stretch
- One compact trigger opening a preset menu

Required content when active:

- Label stays Pause all
- Prominent but restrained countdown summary, for example Paused until 14:30
- Secondary text button: Resume now

Preset menu contract:

- Show exactly four choices: 30 min, 1 hour, 2 hours, Rest of today.
- Present as a compact action list or segmented popover panel.
- Choosing a preset applies immediately and closes the menu.
- Resume now acts immediately and does not ask for confirmation.

### Hero And List Integration

- Keep the existing two-card hero composition from Phase 1.
- Do not add separate scheduler cards beside Next reminder and Today overview.
- Instead, reflect runtime state through compact status pills and next-due language inside existing cards and rows.
- The reminder list remains card-like rows, not a table with new scheduler columns.

### Drawer Extension

- Reminder-level active window editing belongs inside the existing advanced schedule area in [src/features/reminders/components/ReminderDrawer.tsx](src/features/reminders/components/ReminderDrawer.tsx).
- Do not create a new drawer step, nested modal, or separate reminder-settings panel.
- The new active-window section appears after the existing schedule preset and advanced timing controls, and before the enabled toggle/save region.
- The section must inherit the same spacing rhythm and cardless field-group treatment already used in the drawer.

---

## Component Inventory

| Component | Purpose | Notes |
|-----------|---------|-------|
| SchedulerControlStrip | Houses app-wide quiet-hours and pause-all controls | New shared utility tray below top bar |
| QuietHoursTile | Summarizes and edits app-wide quiet hours | Uses compact popover, not drawer |
| PauseAllTile | Starts or clears pause-all state | Four presets only |
| RuntimeStatePill | Shows paused, quiet, or catch-up state lightly | Reuses pill language, not banners |
| ActiveWindowSection | Reminder-level active window editor inside drawer | New subsection inside advanced schedule |
| ActiveWindowToggle | Turns reminder-level active window on or off | User-facing label should be plain-language |
| ActiveWindowFields | Start/end time inputs for active window | Supports cross-midnight |
| ReminderStateHint | Small inline line for suppressed or catch-up explanations | Appears in hero or row metadata only |

Component behavior rules:

- Global controls must expose app-wide state in one place; reminder rows should not duplicate edit controls for quiet hours or pause-all.
- Reminder rows and the next-reminder card may show lightweight runtime consequences, but editing remains in the strip or drawer.
- Active window is user-facing reminder timing, so it belongs with the schedule editor rather than with a global app preference.
- Use icon plus text if an icon is introduced for quiet, pause, or catch-up states; icon-only state markers are not allowed.

---

## Interaction Contract

### Primary Dashboard Flow

1. User lands on the existing dashboard shell.
2. The scheduler control strip explains whether reminders are currently allowed, paused, or deferred by quiet hours.
3. User can set or edit quiet hours from the top strip without leaving the dashboard.
4. User can pause all reminders from the same strip using one of four presets.
5. User can open an existing reminder drawer and extend its advanced schedule with a reminder-level active window.
6. Save remains explicit in the drawer or in the quiet-hours panel.
7. The dashboard updates in place; no route change and no full-screen confirmation state.

### Quiet Hours Flow

1. User opens the Quiet hours panel from the scheduler strip.
2. User enables quiet hours if not already on.
3. User sets start and end times.
4. UI helper explains that 22:00 to 08:00 spans overnight in local time.
5. User saves explicitly.
6. Strip summary updates immediately.
7. If current local time is inside quiet hours, the state line changes to Quiet until {time}; otherwise it reads Allowed now.

### Pause-All Flow

1. User opens the Pause all preset menu.
2. User picks one of the four presets.
3. Pause applies immediately.
4. The strip changes from an idle action state to an active summary state.
5. Existing reminder surfaces update to reflect the paused condition.
6. User may resume early with Resume now.

### Reminder Drawer Active Window Flow

Field order inside the drawer after Phase 2:

1. Reminder type
2. Title
3. Description
4. Schedule mode
5. Preset choices
6. Existing advanced schedule controls
7. Active window section
8. Enabled on save

Active window section contract:

- User-facing label: Allowed hours
- Helper line: This reminder only fires inside this window and still respects app quiet hours.
- First control is a toggle or checkbox labeled Use allowed hours.
- When off, the reminder follows only its base schedule plus global quiet hours.
- When on, reveal start and end time fields.
- Use the same time-input pattern already present in the drawer.
- Include one helper example for cross-midnight ranges, such as 21:00 to 06:00.

Validation and conflict rules:

- Start and end times cannot be identical.
- Invalid time ranges block save and show inline error text under the field group.
- If an active window and global quiet hours create very little overlap, show a soft inline note rather than a destructive warning.
- The note may explain that reminders wait for the next allowed moment when quiet hours and allowed hours do not currently align.

### Runtime State Priority

When multiple scheduler states could apply to the same reminder, surfaces should show only the highest-priority state in the primary pill to stay light.

Priority order:

1. Disabled
2. Paused until {time}
3. Quiet until {time}
4. Allowed after {time}
5. Catch-up next
6. Enabled

State presentation rules:

- Disabled keeps the existing reduced-contrast treatment from Phase 1.
- Paused is global and should read as a temporary app state, not a reminder error.
- Quiet until is used when quiet hours are the governing blocker.
- Allowed after is used when a reminder-level active window is the governing blocker.
- Catch-up next is used only for short-gap reconciliation after relaunch, sleep, or wake.
- Never stack more than one primary pill per reminder row.

### Surface-Specific State Behavior

Next reminder card:

- If pause-all is active, the card may still show the next relevant reminder, but the timing label should change from Next due to Resumes after.
- If quiet hours are suppressing the next due item, the detail line should explain that delivery is deferred until the next allowed time.
- If the selected next item is a catch-up occurrence, the label changes to Catch-up next and the supporting detail explains the wake or relaunch recovery lightly.

Reminder rows:

- Keep the existing row structure.
- Add at most one compact state pill and one short secondary explanation line.
- Do not add columns for suppression reason, last wake time, or recovery source.

Today overview card:

- It may summarize a single app-wide scheduler fact such as Quiet hours on or Paused until 14:30.
- It must not become a mini control center with per-state counters.

---

## Spacing Scale

Phase 2 inherits the Phase 1 spacing scale exactly. All new scheduler UI must stay on the same 4px grid.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Inline icon gaps, compact status spacing |
| sm | 8px | Label-to-field gaps, pill padding |
| md | 16px | Default control spacing, scheduler strip internal gaps |
| lg | 24px | Card padding, drawer section gaps |
| xl | 32px | Hero and strip separation, larger control clusters |
| 2xl | 48px | Major section separation |
| 3xl | 64px | Top-level page breathing room |

Exceptions:

- Minimum click target remains 44px.
- Compact status pills may render at 32px visual height if their containing button or interactive wrapper still respects a 44px hit area.

Phase 2 spacing rules:

- Scheduler strip container padding: 16px vertical, 24px horizontal.
- Gap between Quiet hours and Pause all tiles: 16px.
- Gap between tile title and summary line: 4px.
- Gap between summary line and action row: 8px.
- Active-window field group gap inside the drawer: 16px.
- Gap between advanced schedule controls and active-window section: 24px.

---

## Typography

Phase 2 inherits Phase 1 typography exactly. Do not introduce additional sizes or weights.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.5 |
| Label | 14px | 600 | 1.4 |
| Heading | 20px | 600 | 1.25 |
| Display | 28px | 600 | 1.15 |

Phase 2 typography rules:

- Use Label for quiet-hours and pause-all tile titles, field labels, and runtime pills.
- Use Body for helper copy, timing summaries, and suppression explanations.
- Use Heading for the scheduler strip only when a popover panel title is needed; do not add a new large dashboard headline.
- Use Display only where Phase 1 already uses it for the next due moment; paused or quiet summaries should not become oversized countdowns.

---

## Color

Phase 2 keeps the same palette as Phase 1 and extends it conservatively.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #F4F1EA | Window background, app canvas, large open space |
| Secondary (30%) | #E6E0D5 | Scheduler strip, cards, drawer surface, grouped controls |
| Accent (10%) | #6A8472 | Primary CTA, selected pause preset, active allowed-hours toggle, next reminder emphasis, active runtime summary accents |
| Destructive | #A65F52 | Delete reminder actions and destructive confirmation emphasis only |

Supporting neutrals stay unchanged:

- Primary text: #24312A
- Secondary text: #58655D
- Border: #CFC7BA
- Disabled text: #8B938E
- White highlight: #FAF8F3

Accent reserved for:

- Top-right New reminder button
- Selected pause-all preset in its menu
- Enabled quiet-hours or allowed-hours control state
- Next due or catch-up emphasis inside the next reminder card
- Active runtime summary detail when the app is currently paused

Accent must not be used for:

- Entire scheduler strip backgrounds
- Every status pill
- Quiet-suppressed states by default
- Secondary buttons or helper text
- Historical or diagnostic emphasis that does not exist in Phase 2

State color rules:

- Paused state uses a subdued accent tint or accent border, never a saturated banner.
- Quiet-suppressed state uses neutral surface plus muted text, optionally with a soft border emphasis.
- Catch-up state uses an accent-outline treatment, not a celebratory fill.
- Disabled continues to rely on contrast reduction rather than new color.

---

## Copywriting Contract

Product voice remains:

- Gentle, clear, and matter-of-fact
- Calmly protective when scheduler rules delay a reminder
- Never technical enough to sound like a scheduler console

| Element | Copy |
|---------|------|
| Primary CTA | New reminder |
| Empty state heading | No reminders yet |
| Empty state body | Start with one small rhythm, then add quiet hours or pauses only when you need them. |
| Error state | We could not save these timing rules. Check the quiet hours or allowed hours, then try again. |
| Destructive confirmation | Delete reminder: This removes the reminder and its schedule from your day. |

Global control copy:

- Quiet hours
- Allowed now
- Quiet until {time}
- Edit quiet hours
- Pause all
- Pause reminders for a short stretch
- Paused until {time}
- Resume now
- 30 min
- 1 hour
- 2 hours
- Rest of today

Drawer copy:

- Allowed hours
- Use allowed hours
- This reminder only fires inside this window and still respects app quiet hours.
- Start time
- End time
- Start and end time need to be different.
- This reminder will wait for the next allowed moment when these timing rules overlap tightly.

Runtime state copy direction:

- Disabled for now
- Paused until {time}
- Quiet until {time}
- Allowed after {time}
- Catch-up next
- Deferred to the next allowed time

Copy constraints:

- Do not use backlog, replay queue, suppression engine, reconciliation window, or scheduler pipeline in visible UI.
- Do not imply failure when quiet hours or pause-all are working as intended.
- Prefer deferred, allowed, resume, and next allowed time over blocked, denied, or missed.

---

## Visual Guardrails

- Do not introduce a standalone settings page for quiet hours.
- Do not add a full-width alert banner for paused or quiet state.
- Do not add countdown timers to every reminder row.
- Do not add columns such as status reason, recovery source, or last interruption.
- Do not add analytics counters for missed, deferred, or recovered reminders.
- Do not turn quiet hours into a complex calendar heatmap or timeline control.
- Do not surface multiple simultaneous pills on each reminder row.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not applicable; not initialized on 2026-03-20 |
| Third-party registries | none | not applicable; no external block source approved |

Safety conclusion:

- Phase 2 continues to use only local components and local CSS tokens.
- No third-party registry blocks are approved for the scheduler control strip, quiet-hours panel, or drawer extensions.