# Feature Landscape

**Domain:** Desktop reminder, wellness prompt, focus companion, and habit rhythm apps
**Project:** QuietBloom
**Researched:** 2026-03-18
**Confidence:** MEDIUM-HIGH — based primarily on official product pages and help docs from Time Out, Stretchly, BreakTimer, Focus To-Do, and Habitify

## Table Stakes

Features users already expect from a credible desktop reminder/wellness app. Missing these in v1 makes the product feel incomplete rather than intentionally minimal.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Multiple recurring reminder types | Time Out and Stretchly both center the experience on more than one reminder cadence, such as micro-breaks plus longer breaks | Medium | QuietBloom should support multiple reminder items, not a single global timer |
| Flexible scheduling: interval-based and fixed-time reminders | This is core behavior across break and habit tools; users expect reminders to match real routines rather than one rigid cadence | Medium | Must cover repeating intervals, fixed times, weekdays, and per-reminder active windows |
| Working hours / quiet hours | BreakTimer explicitly markets working hours; users expect the app not to interrupt outside their chosen rhythm | Low-Medium | Include start/end windows and per-day enablement |
| Snooze, skip, and pause controls | Stretchly, BreakTimer, and Time Out all surface postpone/skip behavior because users cannot always stop immediately | Medium | Quick actions should be available from notification and tray/menu bar state where possible |
| Pre-notification and reminder delivery states | Users expect a heads-up before interrupt  ion, then a clear full reminder when it is time | Medium | Good default pattern: advance notice plus visible reminder state with countdown or duration |
| Idle-aware or natural-break handling | Time Out and Stretchly both account for time away from the computer so reminders do not feel dumb | Medium | For v1, detecting idle time and resetting/rescheduling is more valuable than advanced adaptive logic |
| Fast temporary disable controls | Desktop tools commonly live in the tray/menu bar and let users pause for 30 minutes, 1 hour, until morning, or for a meeting | Low-Medium | Important for trust; otherwise users uninstall after a few badly timed prompts |
| Basic prompt content for the reminder | Reminder products are expected to say what to do: drink water, stand, stretch, look away, breathe | Low | Content can be simple text in v1; does not need a large wellness library |
| Visual polish and lightweight customization | BreakTimer and Time Out both emphasize themes/messages; users expect the app to feel pleasant because it interrupts them often | Medium | Theme, copy tone, color treatment, and readable prompt layout matter more than deep theming systems |
| Basic completion/history visibility | Focus To-Do and Habitify train users to expect some record of what happened | Medium | v1 does not need deep analytics, but users benefit from a lightweight history such as completed, snoozed, skipped, missed |
| Reliable desktop persistence | Cross-platform reminder tools are expected to reopen, stay resident, and keep schedule state consistent | Medium | Includes launch-at-login, background scheduling, and robust local persistence |

## Differentiators

Valuable features that can make the product stand out, but are not required to earn trust in an initial release.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Curated wellness prompt packs | Makes reminders feel thoughtful instead of generic, such as eye-rest, desk stretch, hydration, posture, breathing, shutdown ritual packs | Medium | Good second-wave feature after core scheduling is stable |
| Adaptive rhythm logic | Uses idle time, recent snoozes, or current context to shift reminders so they land at better times | High | Strong differentiation, but easy to get wrong and damage trust |
| Strict mode / full-screen break enforcement | Helps users who explicitly want stronger boundaries instead of optional reminders | Medium-High | Stretchly and Time Out support stricter modes; should be optional, never default |
| Focus session companion | Pomodoro or focus blocks paired with recovery prompts bridges wellness and productivity | Medium-High | Focus To-Do shows real demand, but this broadens the product from reminder tool toward focus platform |
| Rich progress views | Streaks, calendars, weekly rhythm summaries, trend charts, and category breakdowns increase retention | Medium-High | Habit apps treat this as a core retention loop; likely defer until reminder data quality is proven |
| Template-based setup | Quick-start flows like “hydration”, “20-20-20 eye rest”, “hourly stand”, “afternoon reset” reduce setup friction | Low-Medium | High leverage differentiator with modest build cost |
| Context-aware pausing | Auto-pause during DND, fullscreen presentation, selected apps, or user inactivity | Medium-High | Very useful on desktop, but platform edge cases can create reliability issues |
| Custom reminder presentation | Different prompt surfaces, ambient overlays, sound themes, multi-monitor placement, or mood-specific visuals | Medium | Differentiates on feel without forcing major product scope growth |
| Habit rhythm layer | Turning reminders into repeatable routines with completion streaks and day planning adds longer-term retention | High | Useful if QuietBloom later expands from prompts to broader rhythm coaching |
| Integrations | Calendar, Apple Health/Google Fit, automation, or API access create ecosystem value | High | Habitify positions these as advanced features, not table stakes for first use |

## Anti-Features

Features likely to create early scope creep, dilute positioning, or add infrastructure burden before the core reminder experience is trustworthy.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Account system and cloud sync in v1 | Adds auth, sync conflict handling, privacy overhead, and support complexity before the core desktop loop is proven | Keep v1 local-first with solid export/import later if needed |
| Full task manager or project planner | Focus To-Do succeeds partly because it is a task app, but that changes the product category and UI complexity dramatically | Keep reminder items lightweight; avoid inboxes, kanban, attachments, and large task hierarchies |
| Social challenges, leaderboards, or friend competitions | Habitify markets challenges, but these are growth/retention layers, not core value for a calm desktop wellness tool | Focus on private, individual rhythm-building first |
| AI-generated plans or coaching in early releases | QuietBloom already marks AI out of scope for v1; adding it early obscures whether the reminder foundation is actually good | Use thoughtful presets and handcrafted copy instead |
| Heavy analytics dashboard | Advanced reporting can consume product effort without improving the core interruption experience | Start with concise history and a few useful summaries |
| Broad health-platform sync | Apple Health, Google Fit, and automation integrations increase permissions, data handling, and platform-specific edge cases | Defer until the local reminder loop and data model stabilize |
| Over-gamification | Badges, points, loot, or streak pressure can undermine the calm wellness positioning | Keep progress lightweight and reflective rather than competitive |
| Too many reminder customization knobs on day one | Deep settings are powerful but can overwhelm new users and slow shipping | Ship strong presets with a clear advanced section only where needed |

## Feature Dependencies

```text
Local persistence + background runtime -> reliable reminders
Reliable reminders -> snooze/skip/pause controls
Reliable reminders + scheduling engine -> working hours / quiet hours
Reliable reminders + idle detection -> natural break handling
Reminder model + history storage -> basic completion/history visibility
Reminder templates + reminder model -> quick-start setup
History storage + categorized reminder events -> rich progress views
Desktop presence signals + platform hooks -> context-aware pausing
Stable reminder engine + optional session timer -> focus session companion
```

## MVP Recommendation

Prioritize:
1. Multiple reminder items with clear create/edit/delete flows
2. Flexible scheduling covering intervals, fixed times, weekdays, and working hours
3. Reliable reminder delivery with snooze, skip, pause, and tray/menu-bar quick controls
4. Polished prompt UI with a small set of built-in wellness reminder templates
5. Lightweight event history so users can tell what they completed, snoozed, or missed

Defer:
- Adaptive rhythm logic: high value, but easy to make feel unpredictable
- Focus session companion: attractive adjacent feature, but broadens scope into productivity tooling
- Rich analytics and streak systems: useful only after reminder data is trustworthy
- Sync/integrations: infrastructure-heavy and not necessary for validating the desktop core
- Social/gamified layers: misaligned with a calm local-first v1

## Practical Product Cut For QuietBloom

For this project specifically, the cleanest v1 line is:
- A local-first desktop reminder app with multiple wellness routines
- Flexible schedules that match real workdays
- Gentle but trustworthy interruption controls
- Attractive reminder presentation that feels intentional rather than clinical

Do not make v1 compete with full habit trackers or task managers. The better comparison set is Time Out, Stretchly, and BreakTimer, with selective borrowing from Focus To-Do and Habitify only where those products reveal user expectations around history, templates, and rhythm visibility.

## Sources

- Time Out official overview and help: https://www.dejal.com/timeout/ — HIGH confidence for break scheduling, themes, skip/postpone, automation, activity tracking
- Stretchly official site and about page: https://hovancik.net/stretchly/ and https://hovancik.net/stretchly/about/ — HIGH confidence for break cadence, pre-notifications, idle-aware handling, DND awareness, strict/fullscreen options, tray controls
- BreakTimer official site: https://breaktimer.app/ — HIGH confidence for schedule setup, working hours, smart notifications, customization
- Focus To-Do official site: https://www.focustodo.cn/ — MEDIUM-HIGH confidence for pomodoro, reminders, subtasks, repeat tasks, reports, sync as focus-product expectations
- Focus To-Do privacy policy: https://www.focustodo.cn/privacy-policy — MEDIUM confidence for account/sync/statistics/leaderboard scope implications
- Habitify official site: https://www.habitify.me/ — MEDIUM-HIGH confidence for streaks, metrics, notes, mood tracking, timer, calendar view, integrations, challenges as habit-tracker differentiation
