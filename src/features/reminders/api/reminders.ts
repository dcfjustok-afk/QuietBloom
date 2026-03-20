import { invoke } from "@tauri-apps/api/core";

import {
  describeReminderSchedule,
  formatMinutesOfDay,
  parseTimeString,
  type ReminderSchedule,
  type ReminderSummary,
  type ReminderType,
  type SaveReminderInput,
} from "../model/reminder";

type NativeReminderSchedule =
  | {
      kind: "interval";
      everyMinutes: number;
      anchorMinuteOfDay: number;
    }
  | {
      kind: "fixed_time";
      weekdays: number[];
      times: string[];
    };

type NativeReminder = {
  id: number;
  type: ReminderType;
  title: string;
  description: string | null;
  enabled: boolean;
  schedule: NativeReminderSchedule;
  nextDueAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type NativeSaveReminderInput = {
  id?: number;
  type: ReminderType;
  title: string;
  description: string;
  enabled: boolean;
  schedule: NativeReminderSchedule;
};

export function listReminders(): Promise<ReminderSummary[]> {
  return invoke<NativeReminder[]>("list_reminders").then((reminders) =>
    reminders.map(toReminderSummary),
  );
}

export function saveReminder(reminder: SaveReminderInput): Promise<ReminderSummary> {
  return invoke<NativeReminder>("save_reminder", {
    reminder: toNativeSaveReminderInput(reminder),
  }).then(toReminderSummary);
}

export function deleteReminder(id: number): Promise<void> {
  return invoke<void>("delete_reminder", { id });
}

export function setReminderEnabled(id: number, enabled: boolean): Promise<ReminderSummary> {
  return invoke<NativeReminder>("set_reminder_enabled", { id, enabled }).then(
    toReminderSummary,
  );
}

function toNativeSaveReminderInput(reminder: SaveReminderInput): NativeSaveReminderInput {
  return {
    ...reminder,
    description: reminder.description,
    schedule: toNativeSchedule(reminder.schedule),
  };
}

function toNativeSchedule(schedule: ReminderSchedule): NativeReminderSchedule {
  if (schedule.kind === "interval") {
    return schedule;
  }

  return {
    kind: "fixed_time",
    weekdays: schedule.weekdays,
    times: schedule.times.map(formatMinutesOfDay),
  };
}

function toReminderSummary(reminder: NativeReminder): ReminderSummary {
  const schedule = toReminderSchedule(reminder.schedule);

  return {
    id: reminder.id,
    type: reminder.type,
    title: reminder.title,
    description: reminder.description,
    enabled: reminder.enabled,
    schedule,
    scheduleSummary: describeReminderSchedule(schedule),
    nextDueAt: reminder.nextDueAt,
  };
}

function toReminderSchedule(schedule: NativeReminderSchedule): ReminderSchedule {
  if (schedule.kind === "interval") {
    return schedule;
  }

  return {
    kind: "fixed_time",
    weekdays: schedule.weekdays,
    times: schedule.times.map(parseTimeString),
  };
}