import { formatMinutesOfDay } from "./reminder";

export const pauseAllPresets = [
  "30_minutes",
  "1_hour",
  "2_hours",
  "rest_of_today",
] as const;

export type PauseAllPreset = (typeof pauseAllPresets)[number];

export type SchedulerSnapshot = {
  quietHours: {
    enabled: boolean;
    startMinuteOfDay: number | null;
    endMinuteOfDay: number | null;
    summary: string;
    stateLabel: string;
  };
  pauseAll: {
    isPaused: boolean;
    pauseUntil: string | null;
    summary: string;
    availablePresets: PauseAllPreset[];
  };
  runtimeSummary: {
    tone: "idle" | "paused" | "quiet";
    title: string;
    detail: string;
  };
  lastRebuiltAt: string | null;
  invalidationCount: number;
};

export function describeQuietHoursRange(startMinuteOfDay: number, endMinuteOfDay: number): string {
  return `${formatMinutesOfDay(startMinuteOfDay)}-${formatMinutesOfDay(endMinuteOfDay)}`;
}