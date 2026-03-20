import { describe, expect, it } from "vitest";

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
      schedule: { ...createCustomIntervalSchedule(), everyMinutes: 95, anchorMinuteOfDay: 495 },
    });

    expect(result.success).toBe(true);
  });

  it("accepts custom fixed-time values from advanced controls", () => {
    const result = reminderFormSchema.safeParse({
      ...defaultReminderInput,
      title: "Look away from the screen",
      schedule: { ...createCustomFixedTimeSchedule(), weekdays: [1, 2, 4, 5], times: [600, 845, 1020] },
    });

    expect(result.success).toBe(true);
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
});