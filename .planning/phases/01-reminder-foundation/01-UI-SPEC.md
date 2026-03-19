---
phase: 01
slug: reminder-foundation
status: draft
shadcn_initialized: false
preset: none
created: 2026-03-19
---

# Phase 01 — UI Design Contract

> Visual and interaction contract for QuietBloom Phase 1. This contract is prescriptive so planning and implementation can proceed without design ambiguity.

---

## Scope Anchors

Locked decisions carried forward from upstream artifacts:

- Home is dashboard-first, not list-first management.
- The primary first-screen story is today's overview plus the next upcoming reminder.
- Reminder creation and editing happen in a right-side drawer with explicit save.
- Schedule editing is preset-first, with advanced options revealed progressively.
- Reminder content uses a type + title + description model.
- Built-in reminder types are hydration, standing, stretching, eye rest, and custom.

Phase 1 is not allowed to center the visual hierarchy around these deferred areas:

- Native notification delivery or permission health
- Snooze, complete, or skip actions
- History timeline or past-event analytics
- Pause-all, quiet hours, or recovery diagnostics

Design tone:

- Calm, restrained, and intentional
- Desktop-native rather than marketing-site glossy
- Supportive rather than medical, gamified, or productivity-policing

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | none in Phase 1 |
| Icon library | app-owned inline SVG icons |
| Font | SF Pro Text, SF Pro Display, PingFang SC, system-ui, sans-serif |

### Why Phase 1 should not use shadcn

- The repository is still a near-default Tauri + React starter and does not yet have Tailwind, components.json, or existing token conventions to anchor a shadcn preset.
- Phase 1 must establish domain structure, persistence flows, and dashboard/drawer information architecture first; adding Tailwind plus registry setup would increase scope and churn without improving reminder correctness.
- The required UI is small and well-bounded: one dashboard shell, one list surface, one right drawer, and a handful of form controls. Hand-authored CSS tokens are enough and keep implementation predictable.
- QuietBloom is a desktop app, not a multi-page marketing surface. Native-feeling spacing, typography, and state clarity matter more than accelerating with a generic web component catalog.
- Avoiding shadcn in Phase 1 also avoids third-party registry review overhead and keeps the component safety story explicit: no external component source is ingested.

### Implementation Direction

- Use a small local token layer in CSS custom properties under the app root.
- Build composable React view primitives for Card, SectionHeader, ReminderRow, DrawerShell, FieldGroup, SegmentedChoice, PresetChip, and StatusPill.
- Keep icons monochrome or duotone-neutral; do not use emoji, mascot illustration, or gamified badges.
- Prefer subtle elevation, border contrast, and spacing rhythm over bright fills or heavy shadows.

---

## Layout Contract

### App Frame

- Single-window desktop layout optimized for widths from 960px to 1440px.
- Main content width: 1120px max, centered, with 24px outer padding at the window edge.
- Top bar height: 64px.
- Top bar content: product label on the left, quiet status text for the day in the middle or right-aligned, primary CTA on the right.
- No permanent sidebar in Phase 1. The app only has one core surface, so a left navigation rail would make the app feel more like an admin tool than a calm daily control surface.

### Screen Hierarchy

1. Top bar
2. Hero row with two cards
3. Reminder list section
4. Right-side drawer for create and edit

### Hero Row

- Two-card composition on desktop.
- Left card: Next Reminder Card, visually dominant, roughly two-thirds of the row.
- Right card: Today Overview Card, visually secondary, roughly one-third of the row.
- Card heights should align visually even if internal content differs.

### Next Reminder Card

Purpose:

- Answer what will happen next without forcing the user to scan the list.

Required content:

- Reminder type icon and type label
- Reminder title
- Short description, truncated to two lines if needed
- Next due time in a higher-emphasis treatment than surrounding metadata
- Enabled or paused state label for the item itself, but not global pause language
- Secondary action link or ghost button: Edit reminder

Visual rules:

- This is the only card allowed to use the accent color as a filled or tinted surface detail.
- Emphasis should come from type scale and spacing first, accent second.
- Do not show a countdown timer animation in Phase 1.

### Today Overview Card

Purpose:

- Answer how the day is shaped at a glance without pretending to be a history dashboard.

Required content:

- Count of enabled reminders
- Count of reminders scheduled for today
- Small summary line such as earliest reminder window or schedule mix

Visual rules:

- Use neutral surfaces only.
- This card must feel supportive and low-pressure; avoid scoreboards, streaks, rings, or achievement framing.

### Reminder List Section

- Section title: Your reminders.
- Optional helper line: adjust what repeats through your day.
- Rows are card-like list items, not table rows.
- Each row contains: type icon, title, description snippet, schedule summary, next due time, enabled toggle, overflow actions.
- Default sort: next due soonest first, then disabled reminders below enabled ones.
- Disabled reminders remain visible but use reduced contrast rather than hidden placement.

### Drawer Contract

- Drawer enters from the right edge.
- Width: 420px fixed on desktop, with 24px internal padding.
- Background uses the secondary surface color, not the dominant app background.
- Header contains title plus dismiss action.
- Footer is sticky and always visible with secondary action on the left and primary save action on the right.
- Saving is explicit. Closing the drawer with unsaved changes triggers a confirmation step.
- The dashboard remains visible behind the drawer to preserve orientation.

---

## Component Inventory

| Component | Purpose | Notes |
|-----------|---------|-------|
| AppTopBar | Frame the calm desktop shell | Contains the only filled primary CTA |
| NextReminderCard | Highlight the next upcoming reminder | Accent allowed here |
| TodayOverviewCard | Summarize today's active reminder footprint | Neutral only |
| ReminderListSection | Contain all reminder rows | Primary management surface under hero |
| ReminderRow | Show one reminder at a glance | Not a dense table row |
| StatusPill | Show enabled or disabled state | Small, not promotional |
| TypeBadge | Show reminder type icon + label | Use icon plus text, not icon alone |
| ReminderDrawer | Create/edit shell | Right-side, explicit save |
| TypeSelector | Choose hydration, standing, stretching, eye rest, custom | Segmented cards or chips, not dropdown first |
| ScheduleModeSwitch | Switch between interval and fixed-time | Two clear options only |
| PresetChipGroup | Fast schedule presets | First interaction point in schedule editor |
| AdvancedSchedulePanel | Progressive disclosure for custom time rules | Closed by default |
| DeleteConfirmation | Confirm destructive removal | Text-first, no alarming red modal styling |

Component behaviors:

- Type is shown as icon plus text label everywhere it appears.
- Enabled state uses a compact switch plus status text, not color alone.
- Overflow actions are text-driven: Edit and Delete.
- Delete is never the primary action in any row or drawer footer.

---

## Interaction Contract

### Primary Flow

1. User lands on a dashboard that explains the day immediately.
2. User clicks New reminder.
3. Right drawer opens without replacing the main screen.
4. User picks a type, edits title and description, then chooses schedule mode.
5. User selects a preset first.
6. User optionally expands Advanced options only if preset choices are insufficient.
7. User saves explicitly.
8. Drawer closes and the dashboard plus list update in place.

### Form Structure Inside Drawer

Field order:

1. Reminder type
2. Title
3. Description
4. Schedule mode
5. Preset choices
6. Advanced options
7. Enabled on save

### Schedule Editor Rules

- First decision is schedule mode, not raw field editing.
- Supported modes in Phase 1: interval and fixed-time.
- Show four presets per mode before any advanced fields.
- Include one explicit custom path in each mode.
- Advanced options are collapsed by default behind a plain-language disclosure label.

Recommended preset labels:

- Interval mode: Every 30 min, Every 45 min, Every 60 min, Custom interval
- Fixed-time mode: Weekdays 10:30, Weekdays 15:00, Weekdays 10:30 + 15:00, Custom times

Advanced panel rules:

- Do not expose quiet hours, pause-all, notification actions, or overdue recovery settings in Phase 1.
- For interval mode, advanced options may include custom hour/minute combination and start reference.
- For fixed-time mode, advanced options may include weekday selection and multiple times.

### Edit and Unsaved Changes

- Editing an existing reminder reuses the same drawer shell and field order.
- If the user has unsaved changes and attempts to close the drawer, show a compact confirmation sheet with three choices: Continue editing, Discard changes, Save reminder.
- Auto-save is not allowed.

### Deletion Contract

- Delete action is available from the row overflow menu and the drawer secondary danger area.
- Confirmation appears in a lightweight modal or inline confirmation panel, not inside the hero area.
- Confirmation requires one extra click only; typed confirmation is too heavy for this product tone.

---

## Spacing Scale

Declared values must stay on a 4px grid.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, inline badge padding |
| sm | 8px | Compact field gaps, pill spacing |
| md | 16px | Default control spacing, row padding |
| lg | 24px | Card padding, section gaps |
| xl | 32px | Hero-card internal spacing, drawer section spacing |
| 2xl | 48px | Major section separation |
| 3xl | 64px | Top-level breathing room below top bar |

Exceptions:

- Minimum touch target for click areas: 44px height.
- Primary button height: 40px is allowed because this is a desktop-first app, but icon-only controls must still render inside a 44px interactive box.

Spacing rules:

- Top bar horizontal padding: 24px.
- Main content vertical gap between hero row and reminder list: 32px.
- Reminder row internal padding: 16px vertically, 24px horizontally.
- Drawer section gap: 24px.
- Field label to control gap: 8px.

---

## Typography

Exactly four sizes and two weights are allowed in Phase 1.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.5 |
| Label | 14px | 600 | 1.4 |
| Heading | 20px | 600 | 1.25 |
| Display | 28px | 600 | 1.15 |

Typography rules:

- Use Body for row metadata, helper text, drawer inputs, and description copy.
- Use Label for section labels, field labels, type badges, and status pills.
- Use Heading for card titles, drawer title, and section headers.
- Use Display only for the next due time or the primary card headline, never for decorative large text.
- Do not introduce a second display size in Phase 1.
- Use sentence case everywhere; avoid all caps labels.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #F4F1EA | Window background, app canvas, large open space |
| Secondary (30%) | #E6E0D5 | Cards, drawer surface, row surfaces, grouped sections |
| Accent (10%) | #6A8472 | Primary CTA fill, active preset chip, selected mode border, next reminder emphasis |
| Destructive | #A65F52 | Delete text button, destructive confirmation emphasis only |

Supporting neutrals:

- Primary text: #24312A
- Secondary text: #58655D
- Border: #CFC7BA
- Disabled text: #8B938E
- White highlight: #FAF8F3

Accent reserved for:

- Top-right New reminder button
- Active schedule preset chip
- Selected schedule mode border or segment indicator
- Next due time emphasis inside Next Reminder Card
- Enabled state dot only when paired with text

Accent must not be used for:

- Every clickable element
- Secondary buttons
- Large card backgrounds beyond the Next Reminder Card tint treatment
- Destructive actions
- Empty-state illustrations or decorative flourishes

Color behavior rules:

- Disabled reminders reduce contrast through text and border shifts, not through opacity lower than 60%.
- Error text uses primary text plus destructive highlights, not a full red page treatment.
- Do not add blue notification-style surfaces in Phase 1; they imply delivery or system health, which is out of scope.

---

## Copywriting Contract

Product voice:

- Gentle, clear, and matter-of-fact
- Encouraging without sounding like coaching
- Never clinical, scolding, or streak-oriented

| Element | Copy |
|---------|------|
| Primary CTA | New reminder |
| Hero helper line | Keep your day moving with a few well-timed prompts. |
| Empty state heading | No reminders yet |
| Empty state body | Start with one small rhythm for your day, like water, standing, or eye rest. |
| Error state | We could not save this reminder. Check the title and schedule, then try again. |
| Unsaved changes prompt | You have changes that are not saved yet. |
| Delete confirmation | Delete reminder: This removes the reminder and its schedule from your day. |

Field copy contract:

- Type section label: Reminder type
- Title label: Title
- Title placeholder: For example, Stand up and reset
- Description label: Description
- Description placeholder: A short note for what to do when this appears
- Schedule section label: Timing
- Advanced disclosure label: Advanced options
- Enabled field label: Keep this reminder active

Type labels:

- Hydration
- Standing
- Stretching
- Eye rest
- Custom

Schedule summary copy style:

- Interval example: Every 45 minutes
- Fixed-time example: Weekdays at 10:30 and 15:00
- Disabled example: Disabled for now

Copy constraints:

- Avoid words such as optimize, compliance, streak, discipline, performance, intervention, treatment.
- Avoid anime-soft healing language such as tiny magic, cozy quest, or sparkle routine.
- Prefer short verbs: start, save, edit, delete, turn on, turn off.

---

## Visual Guardrails

- No charts, rings, progress meters, scorecards, or celebratory completion states in Phase 1.
- No toast stack as the primary feedback pattern; use inline validation and in-drawer status first.
- No full-bleed illustration hero. QuietBloom in Phase 1 needs information clarity, not branding spectacle.
- No dense data table or spreadsheet pattern for reminders.
- No bright blue system-style banner language unless there is a real application error.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not applicable; not initialized on 2026-03-19 |
| Third-party registries | none | not applicable; no external block source approved |

Safety conclusion:

- Phase 1 uses no third-party component registry and no code-imported UI block marketplace.
- Icons should be authored locally as inline SVG components or local asset files.
- If a later phase introduces a component library, the library choice must be reviewed separately with source and dependency audit before adoption.

---

## Planner Notes

The planner should be able to split implementation work along these lines:

1. Establish local design tokens and desktop shell layout.
2. Build dashboard hero cards and reminder list row primitives.
3. Build right drawer shell with explicit-save footer and unsaved-change confirmation.
4. Build reminder type selector and schedule mode switch.
5. Build preset chip groups and advanced schedule panel.
6. Apply copywriting contract and state styling for empty, error, disabled, and edit states.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending