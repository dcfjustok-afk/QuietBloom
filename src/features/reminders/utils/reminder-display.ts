import { format, formatDistanceToNowStrict, isToday, isTomorrow, parseISO } from "date-fns";

import { describeReminderSchedule, type ReminderSummary, type ReminderType } from "../model/reminder";

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

export function formatNextDue(nextDueAt: string | null): { title: string; detail: string } {
  if (!nextDueAt) {
    return {
      title: "No active reminder",
      detail: "Create a reminder or re-enable one to put the next rhythm back in view.",
    };
  }

  const date = parseISO(nextDueAt);
  const distance = formatDistanceToNowStrict(date, { addSuffix: true });

  if (isToday(date)) {
    return {
      title: format(date, "HH:mm"),
      detail: `Today, ${distance}`,
    };
  }

  if (isTomorrow(date)) {
    return {
      title: format(date, "HH:mm"),
      detail: `Tomorrow, ${distance}`,
    };
  }

  return {
    title: format(date, "EEE HH:mm"),
    detail: distance,
  };
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