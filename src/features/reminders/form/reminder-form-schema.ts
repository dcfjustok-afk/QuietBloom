import { z } from "zod";

import {
  createFixedTimeSchedule,
  createIntervalSchedule,
  defaultFixedTimeSchedule,
  defaultReminderSchedule,
  reminderTypes,
  type SaveReminderInput,
} from "../model/reminder";

const activeWindowSchema = z
  .object({
    startMinuteOfDay: z.number().int().min(0).max(1439),
    endMinuteOfDay: z.number().int().min(0).max(1439),
  })
  .refine((value) => value.startMinuteOfDay !== value.endMinuteOfDay, {
    message: "Allowed hours must start and end at different times",
    path: ["endMinuteOfDay"],
  });

export const intervalSchedulePresets = [
  {
    id: "every-30",
    label: "Every 30 min",
    schedule: createIntervalSchedule(30, 540),
  },
  {
    id: "every-45",
    label: "Every 45 min",
    schedule: createIntervalSchedule(45, 540),
  },
  {
    id: "every-60",
    label: "Every 60 min",
    schedule: createIntervalSchedule(60, 540),
  },
] as const;

export const fixedTimeSchedulePresets = [
  {
    id: "weekdays-1030",
    label: "Weekdays 10:30",
    schedule: createFixedTimeSchedule([1, 2, 3, 4, 5], [630]),
  },
  {
    id: "weekdays-1500",
    label: "Weekdays 15:00",
    schedule: createFixedTimeSchedule([1, 2, 3, 4, 5], [900]),
  },
  {
    id: "weekdays-1030-1500",
    label: "Weekdays 10:30 + 15:00",
    schedule: createFixedTimeSchedule([1, 2, 3, 4, 5], [630, 900]),
  },
] as const;

export function createCustomIntervalSchedule() {
  return createIntervalSchedule(90, 540);
}

export function createCustomFixedTimeSchedule() {
  return createFixedTimeSchedule([...defaultFixedTimeSchedule.weekdays], [...defaultFixedTimeSchedule.times]);
}

const intervalScheduleSchema = z.object({
  kind: z.literal("interval"),
  everyMinutes: z.number().int().min(5).max(1440),
  anchorMinuteOfDay: z.number().int().min(0).max(1439),
  activeWindow: activeWindowSchema.nullish(),
});

const fixedTimeScheduleSchema = z.object({
  kind: z.literal("fixed_time"),
  weekdays: z.array(z.number().int().min(1).max(7)).min(1),
  times: z.array(z.number().int().min(0).max(1439)).min(1),
  activeWindow: activeWindowSchema.nullish(),
});

export const reminderScheduleSchema = z.discriminatedUnion("kind", [
  intervalScheduleSchema,
  fixedTimeScheduleSchema,
]);

export const reminderFormSchema = z.object({
  id: z.number().int().positive().optional(),
  type: z.enum(reminderTypes),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string(),
  enabled: z.boolean(),
  schedule: reminderScheduleSchema,
});

export type ReminderFormValues = z.infer<typeof reminderFormSchema>;

export const defaultReminderInput: SaveReminderInput = {
  type: "hydration",
  title: "",
  description: "",
  enabled: true,
  schedule: defaultReminderSchedule,
};