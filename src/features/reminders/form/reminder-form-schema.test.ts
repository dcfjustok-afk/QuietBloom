import { describe, expect, it } from "vitest";

import {
  defaultReminderInput,
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