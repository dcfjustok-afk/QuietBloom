import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "../../../app/AppShell";
import { NextReminderCard } from "./NextReminderCard";
import type { SchedulerSnapshot } from "../model/scheduler";

const listReminders = vi.fn();
const saveReminder = vi.fn();
const deleteReminder = vi.fn();
const setReminderEnabled = vi.fn();
const getSchedulerSnapshot = vi.fn();

vi.mock("../api/reminders", () => ({
  listReminders: (...args: unknown[]) => listReminders(...args),
  saveReminder: (...args: unknown[]) => saveReminder(...args),
  deleteReminder: (...args: unknown[]) => deleteReminder(...args),
  setReminderEnabled: (...args: unknown[]) => setReminderEnabled(...args),
}));

vi.mock("../api/scheduler", async () => {
  const actual = await vi.importActual<typeof import("../api/scheduler")>("../api/scheduler");

  return {
    ...actual,
    getSchedulerSnapshot: (...args: unknown[]) => getSchedulerSnapshot(...args),
    saveQuietHours: vi.fn(),
    pauseAllReminders: vi.fn(),
    resumeAllReminders: vi.fn(),
  };
});

const schedulerSnapshot: SchedulerSnapshot = {
  quietHours: {
    enabled: true,
    startMinuteOfDay: 1320,
    endMinuteOfDay: 480,
    summary: "22:00-08:00",
    stateLabel: "Allowed now",
  },
  pauseAll: {
    isPaused: false,
    pauseUntil: null,
    summary: "Pause reminders for a short stretch",
    availablePresets: ["30_minutes", "1_hour", "2_hours", "rest_of_today"],
  },
  runtimeSummary: {
    tone: "idle",
    title: "Allowed now",
    detail: "Quiet hours and pause-all stay available here without leaving the dashboard.",
  },
  lastRebuiltAt: "2026-03-23T06:00:00Z",
  invalidationCount: 1,
};

describe("NextReminderCard", () => {
  beforeEach(() => {
    listReminders.mockReset();
    saveReminder.mockReset();
    deleteReminder.mockReset();
    setReminderEnabled.mockReset();
    getSchedulerSnapshot.mockReset();
    getSchedulerSnapshot.mockResolvedValue(schedulerSnapshot);
  });

  it("renders schedule summary and next due text", () => {
    render(
      <NextReminderCard
        detail="Today, in 25 minutes"
        onEdit={vi.fn()}
        reminder={{
          id: 11,
          type: "eye_rest",
          title: "Look away",
          description: "Focus on a distant object.",
          enabled: true,
          schedule: { kind: "fixed_time", weekdays: [1, 2, 3, 4, 5], times: [630, 900] },
          scheduleSummary: "Mon, Tue, Wed, Thu, Fri at 10:30, 15:00",
          nextDueAt: "2026-03-20T10:30:00Z",
        }}
        title="10:30"
      />,
    );

    expect(screen.getByText("Look away")).toBeDefined();
    expect(screen.getByText("Mon, Tue, Wed, Thu, Fri at 10:30, 15:00")).toBeDefined();
    expect(screen.getByText("10:30")).toBeDefined();
    expect(screen.getByText("Today, in 25 minutes")).toBeDefined();
  });

  it("chooses the earliest enabled reminder with a persisted next due", async () => {
    listReminders.mockResolvedValue([
      {
        id: 1,
        type: "hydration",
        title: "Drink water",
        description: "Refill your glass.",
        enabled: false,
        schedule: { kind: "interval", everyMinutes: 45, anchorMinuteOfDay: 540 },
        scheduleSummary: "Every 45 min from 09:00",
        nextDueAt: null,
      },
      {
        id: 2,
        type: "standing",
        title: "Stand up",
        description: "Reset your posture.",
        enabled: true,
        schedule: { kind: "interval", everyMinutes: 60, anchorMinuteOfDay: 540 },
        scheduleSummary: "Every 60 min from 09:00",
        nextDueAt: "2026-03-20T11:00:00Z",
      },
      {
        id: 3,
        type: "eye_rest",
        title: "Look away",
        description: "Focus across the room.",
        enabled: true,
        schedule: { kind: "fixed_time", weekdays: [1, 2, 3, 4, 5], times: [630] },
        scheduleSummary: "Mon, Tue, Wed, Thu, Fri at 10:30",
        nextDueAt: "2026-03-20T10:30:00Z",
      },
    ]);

    render(<AppShell />);

    const hero = (await screen.findByText("Next reminder")).closest("section");
    expect(hero).not.toBeNull();
    expect(within(hero as HTMLElement).getByText("Look away")).toBeDefined();
    expect(within(hero as HTMLElement).queryByText("Drink water")).toBeNull();
  });
});
