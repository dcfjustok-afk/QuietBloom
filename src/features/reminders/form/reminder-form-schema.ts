import { z } from "zod";

import {
  defaultReminderSchedule,
  reminderTypes,
  type SaveReminderInput,
} from "../model/reminder";

const intervalScheduleSchema = z.object({
  kind: z.literal("interval"),
  everyMinutes: z.number().int().min(5).max(1440),
  anchorMinuteOfDay: z.number().int().min(0).max(1439),
});

const fixedTimeScheduleSchema = z.object({
  kind: z.literal("fixed_time"),
  weekdays: z.array(z.number().int().min(1).max(7)).min(1),
  times: z.array(z.number().int().min(0).max(1439)).min(1),
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