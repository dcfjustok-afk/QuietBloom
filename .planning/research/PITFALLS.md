# Domain Pitfalls

**Domain:** Desktop reminder and work-rhythm wellness apps
**Researched:** 2026-03-18
**Overall confidence:** MEDIUM

## Critical Pitfalls

Mistakes in this section routinely cause broken trust, missed reminders, or expensive rewrites.

### Pitfall 1: Using UI Timers as the Reminder Engine
**Confidence:** HIGH

**What goes wrong:**
Apps drive reminder delivery from `setTimeout`, `setInterval`, or a foreground run-loop timer and assume those timers represent real scheduling. After sleep, wake, busy event loops, hidden webviews, or long-running work on the main thread, reminders drift, fire late, or disappear.

**Why it happens:**
Web and Cocoa timers are not real-time schedulers. MDN documents that browser timers can be delayed by inactive state, throttling, and main-thread load. Apple documents that `Timer` is not a real-time mechanism and may fire significantly later than scheduled.

**Consequences:**
- Missed reminders after sleep or long idle periods
- Reminder drift that accumulates over the day
- Duplicate catch-up notifications after resume
- Users stop trusting the app within a few sessions

**Warning signs:**
- Reminders fire correctly only while the window is open and active
- Bug reports mention “missed after sleep”, “late by several minutes”, or “burst after unlock”
- Scheduling logic lives only in React state or JS timers
- There is no wake/resume reconciliation path

**Prevention strategy:**
- Treat scheduling as persisted state, not in-memory timer state
- Store the next due time as an absolute timestamp plus recurrence rule
- Reconcile schedules on app launch, wake, clock change, timezone change, and settings edits
- Use native notification delivery where possible instead of relying on the webview event loop to stay awake
- Build a deterministic scheduler that computes the next occurrence from source rules rather than chaining intervals forever

**Which phase should address it:**
Reminder engine foundation

**Detection:**
- Automated tests that simulate long gaps between “tick” events
- Manual tests across sleep/wake, screen lock, and app relaunch
- Event logs comparing scheduled time, actual fire time, and user-visible delivery time

### Pitfall 2: Assuming “Notification Sent” Means “Reminder Reliably Delivered”
**Confidence:** HIGH

**What goes wrong:**
The app marks a reminder as handled once it requests a notification, but real delivery depends on permission state, OS presentation rules, focus/do-not-disturb behavior, installed-build conditions, and foreground handling logic.

**Why it happens:**
Developers collapse multiple states into one boolean. Tauri’s notification plugin requires permission checks and requests. Apple’s notification APIs distinguish scheduling from presentation and require explicit delegate handling for foreground behavior.

**Consequences:**
- Silent failures when permission is denied or revoked
- Foreground reminders never visually appear
- Users think the product is unreliable even when internal state says success
- Support becomes guesswork because there is no delivery audit trail

**Warning signs:**
- No explicit permission onboarding or permission-state UI
- No distinction between scheduled, delivered, displayed, dismissed, and completed
- The app never surfaces OS notification status after first run
- Reliability testing only happens in development, not in installed builds

**Prevention strategy:**
- Model notification state explicitly: permission, scheduled, delivered, interacted, expired
- Add a settings screen that shows notification health and recovery guidance
- Implement foreground presentation behavior intentionally instead of accepting silent defaults
- Keep an in-app reminder inbox/history so missed OS presentation does not equal lost reminder state
- Test release-like installed builds, not only the Tauri dev shell

**Which phase should address it:**
Notification delivery integration

**Detection:**
- QA matrix covering granted, denied, revoked, and provisional-like permission states where applicable
- Logs for schedule request success, delivery callbacks, and user actions
- Smoke tests in installed macOS builds before every milestone close

### Pitfall 3: Failing to Handle Sleep, Wake, Clock Changes, and Time Zones as First-Class Events
**Confidence:** HIGH

**What goes wrong:**
Fixed-time reminders shift by an hour, interval reminders skip across sleep, and “every weekday at 10:00” behaves differently after DST or timezone changes.

**Why it happens:**
Reminder products mix two different concepts: elapsed-duration schedules and wall-clock schedules. They also ignore OS lifecycle events even though macOS exposes sleep and wake notifications.

**Consequences:**
- Water reminders cluster after wake
- Lunch or stretch reminders fire at the wrong local hour after travel or DST
- Users cannot predict the system’s behavior, which breaks trust quickly

**Warning signs:**
- One scheduling model is used for both “every 45 minutes” and “at 3:00 PM”
- No code path listens for wake or clock-related resync triggers
- QA does not include DST boundaries or timezone changes

**Prevention strategy:**
- Separate interval-based schedules from calendar-based schedules in both UI and domain model
- Recompute future occurrences after wake, significant clock change, and timezone change
- Define clear catch-up policy: skip, collapse, or summarize missed reminders instead of replaying all of them
- Persist the last-evaluated time and compare against current wall time on resume

**Which phase should address it:**
Scheduling semantics and lifecycle hardening

**Detection:**
- Scenario tests for DST forward/back transitions
- Manual tests by changing timezone with active reminders
- Resume tests after short sleep and overnight sleep

### Pitfall 4: Ambiguous Snooze, Dismiss, and Complete Semantics
**Confidence:** HIGH

**What goes wrong:**
Snoozed reminders reappear twice, dismissed reminders come back unexpectedly, or a completed reminder still has a pending OS notification attached to the old occurrence.

**Why it happens:**
The product treats reminder actions as UI events instead of state transitions on a specific reminder occurrence. Without stable identifiers and idempotent behavior, action handling becomes race-prone.

**Consequences:**
- Duplicate reminders
- Lost or contradictory task state
- Hard-to-reproduce bugs around fast repeated actions
- Painful migrations once multiple reminder types exist

**Warning signs:**
- Snooze logic creates a new reminder instead of a new occurrence state
- Pending notifications cannot be mapped back to a specific occurrence
- Dismiss and complete are handled by the same code path

**Prevention strategy:**
- Introduce an occurrence-level state machine with explicit transitions
- Use stable IDs for reminder templates and generated occurrences
- Make snooze idempotent and cancel/replace pending notification requests by identifier
- Record user action timestamps and sources so state can be rebuilt after restart

**Which phase should address it:**
Reminder action model and snooze flows

**Detection:**
- Tests for repeated snooze taps, dismiss-then-open-app flows, and app restart mid-action
- Instrumentation that flags multiple active notifications for one occurrence

### Pitfall 5: Overbuilding V1 Before Reliability Is Proven
**Confidence:** MEDIUM

**What goes wrong:**
The product ships AI suggestions, streak systems, analytics, templates, tags, multiple wellness programs, and dense dashboards before it can reliably deliver and manage a handful of reminders.

**Why it happens:**
Reminder and habit domains invite feature creep because adjacent ideas are easy to imagine and hard to prioritize. Teams optimize for breadth instead of trust.

**Consequences:**
- Core reminder engine remains fragile
- UI becomes crowded before interaction patterns are validated
- Roadmap time gets consumed by low-leverage features
- The product feels ambitious but not dependable

**Warning signs:**
- The backlog contains AI planning, deep analytics, or gamification ahead of notification health
- Reminder creation/editing is still awkward while new feature areas keep appearing
- Product discussions focus on differentiation before baseline trust is solved

**Prevention strategy:**
- Gate all v1 scope behind one rule: it must improve creation, scheduling, delivery, snooze, or visual polish
- Defer AI, cloud sync, advanced analytics, and heavy gamification until reminder reliability metrics are acceptable
- Keep the first milestone opinionated and small: create reminders, schedule them correctly, deliver them reliably, and make the experience pleasant

**Which phase should address it:**
Roadmap scoping and milestone definition

**Detection:**
- Milestone review shows more work on peripheral features than on scheduler and delivery testing
- User testing feedback says “too much going on” or “I still don’t trust it”

## Moderate Pitfalls

### Pitfall 6: Making Setup and Editing Too Heavy for Frequent Use
**Confidence:** MEDIUM

**What goes wrong:**
Creating a reminder feels like filling out a form. Users have to decide interval mode, fixed time mode, recurrence edge cases, sound, labels, behavior on missed reminders, and snooze rules before they even see value.

**Why it happens:**
Product teams expose the internal scheduling model directly in the UI. Habit apps often overfit for flexibility and accidentally add friction to the most common flow.

**Consequences:**
- Users abandon setup after one or two reminders
- Editing becomes cognitively expensive
- Flexibility exists on paper but usage stays shallow

**Warning signs:**
- First-run setup needs more than one dense screen
- Users need explanatory text for basic reminder creation
- Advanced controls appear before defaults or presets

**Prevention strategy:**
- Use progressive disclosure: simple presets first, advanced controls second
- Separate common quick-create flows from expert scheduling flows
- Provide strong defaults for interval, snooze, and presentation
- Make editing reversible and previewable so users can trust changes

**Which phase should address it:**
Reminder editor UX

### Pitfall 7: Designing Reminders That Interrupt Work Instead of Supporting It
**Confidence:** MEDIUM

**What goes wrong:**
The app nags during meetings, full-screen work, or focused sessions. Users respond by disabling notifications entirely, snoozing everything indefinitely, or uninstalling the app.

**Why it happens:**
Reminder apps often optimize for frequency, not context cost. Wellness intent does not excuse badly timed interruption.

**Consequences:**
- Rapid notification fatigue
- High dismissal rates
- Users feel judged or annoyed instead of supported

**Warning signs:**
- Very high snooze or dismiss rates shortly after reminders appear
- Users repeatedly pause the app during calls or presentations
- There is no concept of quiet hours, temporary pause, or catch-up summary

**Prevention strategy:**
- Add quick pause modes, quiet hours, and humane missed-reminder policies
- Prefer one clear reminder over repeated escalation spam
- Tune copy, animation, and sound to feel gentle rather than punitive
- Respect focus-heavy contexts before adding stronger nagging mechanics

**Which phase should address it:**
Reminder experience tuning

### Pitfall 8: No Auditability for “Why Did This Reminder Fire?”
**Confidence:** HIGH

**What goes wrong:**
When something feels off, neither the user nor the developer can reconstruct whether the reminder was scheduled wrong, delayed by the OS, snoozed, or re-created after resume.

**Why it happens:**
The app stores only the current reminder definition and not the event trail behind each occurrence.

**Consequences:**
- Reliability bugs stay anecdotal and unresolved
- Support cannot distinguish user misunderstanding from scheduler defects
- Regressions reappear because root causes stay hidden

**Warning signs:**
- There is no reminder history timeline
- Logs do not include scheduled time versus actual presentation time
- QA failures are described only in prose, not reproducible traces

**Prevention strategy:**
- Add lightweight local event logging for occurrence generation, schedule request, delivery, action, and reconciliation
- Surface a human-readable history/debug view for internal testing
- Keep logs local-first and privacy-preserving while still useful for diagnosis

**Which phase should address it:**
Reliability instrumentation

## Minor Pitfalls

### Pitfall 9: Weak Persistence and Migration Planning
**Confidence:** HIGH

**What goes wrong:**
Reminders disappear, duplicate, or change meaning after app restart or after schema updates.

**Why it happens:**
The app starts with ad hoc local storage and no versioned data model, then scheduling behavior evolves faster than the stored format.

**Consequences:**
- Reminder loss on upgrade
- Corrupted schedules after feature additions
- Higher cost when introducing new recurrence or snooze capabilities

**Warning signs:**
- Reminder records have no schema version
- Runtime-derived fields are persisted as if they were source-of-truth fields
- There is no migration test coverage

**Prevention strategy:**
- Version the reminder schema from the first persistent release
- Persist source rules separately from derived next-occurrence data
- Add migration fixtures before shipping major scheduling changes

**Which phase should address it:**
Persistence foundation

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Persistence foundation | Weak persistence and migration planning | Version schema early; separate source rules from derived schedule state |
| Reminder engine foundation | Using UI timers as the reminder engine | Persist absolute next-fire state and reconcile on launch/resume |
| Notification delivery integration | Assuming sent equals delivered | Model permission/delivery states and test installed builds |
| Scheduling semantics and lifecycle hardening | Ignoring sleep, wake, DST, timezone changes | Split interval vs wall-clock rules and resync on lifecycle events |
| Reminder action model and snooze flows | Ambiguous snooze, dismiss, complete behavior | Use occurrence-level state machine and stable identifiers |
| Reminder editor UX | Setup/editing too heavy | Use presets and progressive disclosure |
| Reminder experience tuning | Interruptive reminders create fatigue | Add pause modes, quiet hours, and gentle presentation |
| Reliability instrumentation | No auditability for reminder behavior | Log occurrence lifecycle and expose internal history view |
| Roadmap scoping and milestone definition | Overbuilding v1 before trust is earned | Keep milestone scope anchored to reminder trust and polish |

## Sources

- Apple Foundation Timer documentation: timers are not real-time mechanisms and may fire later than scheduled. Confidence: HIGH. https://developer.apple.com/documentation/foundation/timer
- Apple AppKit `NSWorkspace.willSleepNotification`: macOS exposes sleep events that apps can observe. Confidence: HIGH. https://developer.apple.com/documentation/appkit/nsworkspace/willsleepnotification
- Apple AppKit `NSWorkspace.didWakeNotification`: macOS exposes wake events that apps can observe. Confidence: HIGH. https://developer.apple.com/documentation/appkit/nsworkspace/didwakenotification
- Apple Local and Remote Notification Programming Guide: scheduling, identifiers, delegate handling, and foreground presentation behavior matter for reliable notification UX. Confidence: HIGH. https://developer.apple.com/library/archive/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/SchedulingandHandlingLocalNotifications.html
- Tauri v2 notification plugin documentation: permission checks are explicit and notification behavior must be implemented intentionally. Confidence: HIGH. https://v2.tauri.app/plugin/notification/
- MDN `setTimeout()` delays and throttling: browser timers can fire later than requested due to inactive state, throttling, and busy threads. Confidence: HIGH. https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout#reasons_for_delays_longer_than_specified
- Product-scope and UX-friction observations are synthesized from domain patterns rather than a single authoritative source. Confidence: MEDIUM.