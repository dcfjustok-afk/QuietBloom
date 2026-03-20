export const reminderTypes = [
  "hydration",
  "standing",
  "stretching",
  "eye_rest",
  "custom",
] as const;

export type ReminderType = (typeof reminderTypes)[number];

export type IntervalSchedule = {
  kind: "interval";
  everyMinutes: number;
  anchorMinuteOfDay: number;
};

export type FixedTimeSchedule = {
  kind: "fixed_time";
  weekdays: number[];
  times: number[];
};

export type ReminderSchedule = IntervalSchedule | FixedTimeSchedule;

export type ReminderSummary = {
  id: number;
  type: ReminderType;
  title: string;
  description: string | null;
  enabled: boolean;
  schedule: ReminderSchedule;
  scheduleSummary: string;
  nextDueAt: string | null;
};

export type SaveReminderInput = {
  id?: number;
  type: ReminderType;
  title: string;
  description: string;
  enabled: boolean;
  schedule: ReminderSchedule;
};

export const defaultReminderSchedule: ReminderSchedule = {
  kind: "interval",
  everyMinutes: 60,
  anchorMinuteOfDay: 540,
};

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function formatMinutesOfDay(value: number): string {
  const hours = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (value % 60).toString().padStart(2, "0");

  return `${hours}:${minutes}`;
}

export function parseTimeString(value: string): number {
  const trimmed = value.trim();
  const [hoursText, minutesText] = trimmed.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error(`Invalid time string: ${value}`);
  }

  return hours * 60 + minutes;
}

export function describeReminderSchedule(schedule: ReminderSchedule): string {
  if (schedule.kind === "interval") {
    return `Every ${schedule.everyMinutes} min from ${formatMinutesOfDay(schedule.anchorMinuteOfDay)}`;
  }

  const weekdays = schedule.weekdays
    .map((weekday) => weekdayLabels[weekday - 1] ?? `Day ${weekday}`)
    .join(", ");
  const times = schedule.times.map(formatMinutesOfDay).join(", ");
  return `${weekdays} at ${times}`;
}