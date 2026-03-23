import { invoke } from "@tauri-apps/api/core";

import type { LocalTimeWindow } from "../model/reminder";
import type { PauseAllPreset, SchedulerSnapshot } from "../model/scheduler";

export const schedulerCommandNames = {
  getSnapshot: "get_scheduler_snapshot",
  saveQuietHours: "save_quiet_hours",
  pauseAll: "pause_all_reminders",
  resumeAll: "resume_all_reminders",
} as const;

export function getSchedulerSnapshot(): Promise<SchedulerSnapshot> {
  return invoke<SchedulerSnapshot>(schedulerCommandNames.getSnapshot);
}

export function saveQuietHours(quietHours: LocalTimeWindow | null): Promise<SchedulerSnapshot> {
  return invoke<SchedulerSnapshot>(schedulerCommandNames.saveQuietHours, {
    quietHours,
  });
}

export function pauseAllReminders(preset: PauseAllPreset): Promise<SchedulerSnapshot> {
  return invoke<SchedulerSnapshot>(schedulerCommandNames.pauseAll, {
    preset,
  });
}

export function resumeAllReminders(): Promise<SchedulerSnapshot> {
  return invoke<SchedulerSnapshot>(schedulerCommandNames.resumeAll);
}