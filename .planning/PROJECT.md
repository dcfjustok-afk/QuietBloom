# QuietBloom

## What This Is

QuietBloom is a desktop rhythm and wellness reminder tool built with Tauri and React for people who want healthier work habits without breaking focus. The first release centers on configurable reminders such as drinking water, standing up, and taking short breaks, with an emphasis on smooth interaction, attractive UI, and reliable local notifications.

## Core Value

Users can set up and trust beautiful, low-friction reminders that fit their work rhythm.

## Requirements

### Validated

- ✓ User can launch a local desktop shell on macOS from the existing Tauri + React template — existing
- ✓ User can run a front-end application inside the Tauri desktop window — existing

### Active

- [ ] User can create and manage multiple reminder tasks for healthy work habits
- [ ] User can configure reminder timing with fixed intervals, specific times, and snooze behavior
- [ ] User receives reliable, polished desktop reminder experiences with strong visual quality

### Out of Scope

- AI-generated reminder plans in v1 — core reminder experience must be stable before adding intelligence
- Account system or cloud sync in v1 — local-first scope keeps the first release focused and shippable
- Advanced analytics as a primary v1 goal — useful later, but not more important than reminder flow and UI quality

## Context

- The project starts from a freshly initialized Tauri 2 + React 19 + TypeScript + Vite template.
- The product idea is broader than water reminders; it is a desktop habit and rhythm assistant focused on recurring health prompts during work.
- The first release should be usable by other people, not only the creator, so product decisions should avoid overly personal assumptions.
- The user explicitly wants flexible scheduling in v1, including interval-based reminders, fixed-time reminders, and snoozing.
- UI quality is a first-class requirement. The app should feel smooth and intentional rather than like a raw utility.
- The current codebase already has a generated codebase map under .planning/codebase/ that describes the starter template structure.

## Constraints

- **Tech stack**: Tauri + React + TypeScript — preserve the current desktop architecture and build flow
- **Scope**: Local-first desktop app — avoid introducing backend or account infrastructure in v1
- **Product priority**: UI polish and smoothness are top-tier deliverables — functional completeness alone is not enough
- **AI scope**: AI is not part of v1 core scope — keep initial phases focused on reminder product fundamentals
- **Reliability**: Reminder delivery must be trustworthy — reminder logic and notification behavior cannot be treated as secondary details

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build for broader users, not just the creator | Product structure, language, and flows should generalize beyond one person's habits | — Pending |
| Prioritize flexible reminder scheduling in v1 | The most important differentiation for the first release is usable reminder configuration, not just simple timers | — Pending |
| Keep AI out of the first release | AI would expand scope before the reminder foundation is proven | — Pending |
| Treat UI polish as a core deliverable | The success bar includes visual quality and smooth interaction, not only correctness | — Pending |

---
*Last updated: 2026-03-18 after initialization*