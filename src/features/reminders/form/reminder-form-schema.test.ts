import { describe, expect, it } from "vitest";

import { schedulerCommandNames } from "../api/scheduler";
import type { SchedulerSnapshot } from "../model/scheduler";
import {
  createCustomFixedTimeSchedule,
  createCustomIntervalSchedule,
  defaultReminderInput,
  fixedTimeSchedulePresets,
  intervalSchedulePresets,
  reminderFormSchema,
} from "./reminder-form-schema";

describe("reminderFormSchema", () => {
  it("accepts a valid interval payload", () => {
    const result = reminderFormSchema.safeParse({
      ...defaultReminderInput,
      title: "Drink water",
      schedule: { kind: "interval", everyMinutes: 45, anchorMinuteOfDay: 540 },
    });

    expect(result.success).toBe(true);
  });

  it("accepts a valid fixed-time payload", () => {
    const result = reminderFormSchema.safeParse({
      ...defaultReminderInput,
      title: "Protect your eyes",
      schedule: { kind: "fixed_time", weekdays: [1, 3, 5], times: [540, 870] },
    });

    expect(result.success).toBe(true);
  });

  it("accepts interval presets without reshaping the payload", () => {
    const preset = intervalSchedulePresets[1];
    const result = reminderFormSchema.safeParse({
      ...defaultReminderInput,
      title: "Stretch briefly",
      schedule: preset.schedule,
    });

    expect(result.success).toBe(true);
    expect(result.data?.schedule).toEqual(preset.schedule);
  });

  it("accepts fixed-time presets without advanced fields", () => {
    const preset = fixedTimeSchedulePresets[2];
    const result = reminderFormSchema.safeParse({
      ...defaultReminderInput,
      title: "Reset focus",
      schedule: preset.schedule,
    });

    expect(result.success).toBe(true);
    expect(result.data?.schedule).toEqual(preset.schedule);
  });

  it("accepts custom interval values from advanced controls", () => {
    const result = reminderFormSchema.safeParse({
      ...defaultReminderInput,
      title: "Walk briefly",
      schedule: {
        ...createCustomIntervalSchedule(),
        everyMinutes: 95,
        anchorMinuteOfDay: 495,
        activeWindow: { startMinuteOfDay: 540, endMinuteOfDay: 1020 },
      },
    });

    expect(result.success).toBe(true);
    expect(result.data?.schedule).toMatchObject({
      activeWindow: { startMinuteOfDay: 540, endMinuteOfDay: 1020 },
    });
  });

  it("accepts custom fixed-time values from advanced controls", () => {
    const result = reminderFormSchema.safeParse({
      ...defaultReminderInput,
      title: "Look away from the screen",
      schedule: {
        ...createCustomFixedTimeSchedule(),
        weekdays: [1, 2, 4, 5],
        times: [600, 845, 1020],
        activeWindow: { startMinuteOfDay: 480, endMinuteOfDay: 1260 },
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects identical active-window boundaries", () => {
    const result = reminderFormSchema.safeParse({
      ...defaultReminderInput,
      title: "Deep work block",
      schedule: {
        kind: "interval",
        everyMinutes: 60,
        anchorMinuteOfDay: 540,
        activeWindow: { startMinuteOfDay: 600, endMinuteOfDay: 600 },
      },
    });

    expect(result.success).toBe(false);
  });

  it("rejects an empty title", () => {
    const result = reminderFormSchema.safeParse({
      ...defaultReminderInput,
      title: "   ",
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty weekday arrays", () => {
    const result = reminderFormSchema.safeParse({
      ...defaultReminderInput,
      title: "Stretch",
      schedule: { kind: "fixed_time", weekdays: [], times: [600] },
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty time arrays", () => {
    const result = reminderFormSchema.safeParse({
      ...defaultReminderInput,
      title: "Stretch",
      schedule: { kind: "fixed_time", weekdays: [2, 4], times: [] },
    });

    expect(result.success).toBe(false);
  });

  it("rejects out-of-range intervals", () => {
    const result = reminderFormSchema.safeParse({
      ...defaultReminderInput,
      title: "Stand up",
      schedule: { kind: "interval", everyMinutes: 4, anchorMinuteOfDay: 540 },
    });

    expect(result.success).toBe(false);
  });

  it("defines a typed scheduler snapshot contract for quiet hours and pause-all state", () => {
    const snapshot: SchedulerSnapshot = {
      quietHours: {
        enabled: true,
        startMinuteOfDay: 1320,
        endMinuteOfDay: 480,
        summary: "22:00–08:00",
        stateLabel: "Quiet until 08:00",
      },
      pauseAll: {
        isPaused: true,
        pauseUntil: "2026-03-23T06:30:00Z",
        summary: "Paused until 14:30",
        availablePresets: ["30_minutes", "1_hour", "2_hours", "rest_of_today"],
      },
      runtimeSummary: {
        tone: "paused",
        title: "Paused until 14:30",
        detail: "Resume now or let reminders recompute from the current rules when the pause ends.",
      },
      lastRebuiltAt: "2026-03-23T06:00:00Z",
      invalidationCount: 2,
    };

    expect(snapshot.runtimeSummary.tone).toBe("paused");
    expect(snapshot.pauseAll.availablePresets).toEqual([
      "30_minutes",
      "1_hour",
      "2_hours",
      "rest_of_today",
    ]);
  });

  it("limits the native scheduler command surface to phase 2 timing controls", () => {
    expect(Object.values(schedulerCommandNames)).toEqual([
      "get_scheduler_snapshot",
      "save_quiet_hours",
      "pause_all_reminders",
      "resume_all_reminders",
    ]);
  });
});