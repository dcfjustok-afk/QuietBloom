import { format, formatDistanceToNowStrict, isToday, isTomorrow, parseISO } from "date-fns";

import { describeReminderSchedule, type ReminderSummary, type ReminderType } from "../model/reminder";

type NextDuePresentation = {
  timingLabel: string;
  stateLabel: string;
  stateTone: "active" | "inactive" | "neutral";
  title: string;
  detail: string;
};

export function sortReminders(reminders: ReminderSummary[]): ReminderSummary[] {
  return [...reminders].sort((left, right) => {
    if (left.enabled !== right.enabled) {
      return left.enabled ? -1 : 1;
    }

    const leftDue = left.nextDueAt ? Date.parse(left.nextDueAt) : Number.POSITIVE_INFINITY;
    const rightDue = right.nextDueAt ? Date.parse(right.nextDueAt) : Number.POSITIVE_INFINITY;

    if (leftDue !== rightDue) {
      return leftDue - rightDue;
    }

    return left.title.localeCompare(right.title);
  });
}

function formatUpcomingDate(nextDueAt: string): NextDuePresentation {
  const date = parseISO(nextDueAt);
  const distance = formatDistanceToNowStrict(date, { addSuffix: true });

  if (isToday(date)) {
    return {
      timingLabel: "Next due",
      stateLabel: "Enabled",
      stateTone: "active",
      title: format(date, "HH:mm"),
      detail: `Today, ${distance}`,
    };
  }

  if (isTomorrow(date)) {
    return {
      timingLabel: "Next due",
      stateLabel: "Enabled",
      stateTone: "active",
      title: format(date, "HH:mm"),
      detail: `Tomorrow, ${distance}`,
    };
  }

  return {
    timingLabel: "Next due",
    stateLabel: "Enabled",
    stateTone: "active",
    title: format(date, "EEE HH:mm"),
    detail: distance,
  };
}

function formatClock(nextDueAt: string): string {
  return format(parseISO(nextDueAt), "HH:mm");
}

function formatStateAwareNextDue(reminder: Pick<ReminderSummary, "enabled" | "nextDueAt" | "nextDueKind" | "runtimeStatus">): NextDuePresentation {
  if (!reminder.nextDueAt) {
    return {
      timingLabel: "Next due",
      stateLabel: reminder.enabled ? "Enabled" : "Disabled",
      stateTone: reminder.enabled ? "active" : "inactive",
      title: "No active reminder",
      detail: reminder.enabled
        ? "Waiting for the next occurrence."
        : "Disabled for now",
    };
  }

  const upcoming = formatUpcomingDate(reminder.nextDueAt);
  const runtimeStatus = reminder.runtimeStatus ?? "scheduled";
  const nextDueKind = reminder.nextDueKind ?? "normal";

  if (!reminder.enabled) {
    return {
      ...upcoming,
      stateLabel: "Disabled",
      stateTone: "inactive",
    };
  }

  if (runtimeStatus === "paused") {
    return {
      ...upcoming,
      timingLabel: "Resumes after",
      stateLabel: `Paused until ${formatClock(reminder.nextDueAt)}`,
      stateTone: "active",
      detail: "Pause-all is holding this reminder until the current pause ends.",
    };
  }

  if (runtimeStatus === "deferred_by_quiet_hours") {
    return {
      ...upcoming,
      timingLabel: "Quiet until",
      stateLabel: `Quiet until ${formatClock(reminder.nextDueAt)}`,
      stateTone: "neutral",
      detail: "Delivery is deferred to the next allowed moment after quiet hours.",
    };
  }

  if (runtimeStatus === "deferred_by_active_window") {
    return {
      ...upcoming,
      timingLabel: "Allowed after",
      stateLabel: `Allowed after ${formatClock(reminder.nextDueAt)}`,
      stateTone: "neutral",
      detail: "This reminder waits for its allowed hours before it returns.",
    };
  }

  if (nextDueKind === "catch_up") {
    return {
      ...upcoming,
      timingLabel: "Catch-up next",
      stateLabel: "Catch-up next",
      stateTone: "active",
      detail: "Recovered after a short interruption and ready to resume gently.",
    };
  }

  return upcoming;
}

export function formatHeroNextDue(reminder: ReminderSummary | null): NextDuePresentation {
  if (!reminder) {
    return {
      timingLabel: "Next due",
      stateLabel: "Idle",
      stateTone: "neutral",
      title: "No active reminder",
      detail: "Create a reminder or re-enable one to put the next rhythm back in view.",
    };
  }

  return formatStateAwareNextDue(reminder);
}

export function formatReminderNextDue(
  reminder: Pick<ReminderSummary, "enabled" | "nextDueAt" | "nextDueKind" | "runtimeStatus">,
): NextDuePresentation {
  return formatStateAwareNextDue(reminder);
}

export function countDueToday(reminders: ReminderSummary[]): number {
  return reminders.filter((reminder) => reminder.nextDueAt && isToday(parseISO(reminder.nextDueAt))).length;
}

export function summarizeScheduleMix(reminders: ReminderSummary[]): string {
  const intervalCount = reminders.filter((reminder) => reminder.schedule.kind === "interval").length;
  const fixedTimeCount = reminders.length - intervalCount;

  if (reminders.length === 0) {
    return "Build a gentle rhythm with hydration, posture, and eye-rest reminders.";
  }

  return `${intervalCount} interval · ${fixedTimeCount} fixed-time`;
}

export function getReminderTypeMeta(type: ReminderType): { label: string; glyph: string } {
  switch (type) {
    case "hydration":
      return { label: "Hydration", glyph: "HY" };
    case "standing":
      return { label: "Standing", glyph: "ST" };
    case "stretching":
      return { label: "Stretching", glyph: "SR" };
    case "eye_rest":
      return { label: "Eye rest", glyph: "ER" };
    case "custom":
      return { label: "Custom", glyph: "CU" };
  }
}

export function formatDrawerTimingSummary(reminder: Pick<ReminderSummary, "schedule">): string {
  if (reminder.schedule.kind === "interval") {
    const startHour = Math.floor(reminder.schedule.anchorMinuteOfDay / 60)
      .toString()
      .padStart(2, "0");
    const startMinutes = (reminder.schedule.anchorMinuteOfDay % 60).toString().padStart(2, "0");
    return `Every ${reminder.schedule.everyMinutes} minutes starting at ${startHour}:${startMinutes}`;
  }

  return describeReminderSchedule(reminder.schedule);
}