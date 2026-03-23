import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "../../../app/AppShell";
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

describe("ReminderRow flows", () => {
  beforeEach(() => {
    listReminders.mockReset();
    saveReminder.mockReset();
    deleteReminder.mockReset();
    setReminderEnabled.mockReset();
    getSchedulerSnapshot.mockReset();
    getSchedulerSnapshot.mockResolvedValue(schedulerSnapshot);
  });

  it("edits toggles deletes", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    listReminders
      .mockResolvedValueOnce([
        {
          id: 1,
          type: "hydration",
          title: "Drink water",
          description: "Refill your glass.",
          enabled: true,
          schedule: { kind: "interval", everyMinutes: 60, anchorMinuteOfDay: 540 },
          scheduleSummary: "Every 60 min from 09:00",
          nextDueAt: "2026-03-20T08:30:00Z",
        },
        {
          id: 2,
          type: "standing",
          title: "Stand up",
          description: "Take a short posture break.",
          enabled: true,
          schedule: { kind: "interval", everyMinutes: 90, anchorMinuteOfDay: 540 },
          scheduleSummary: "Every 90 min from 09:00",
          nextDueAt: "2026-03-20T10:00:00Z",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 1,
          type: "hydration",
          title: "Drink water",
          description: "Refill your glass.",
          enabled: false,
          schedule: { kind: "interval", everyMinutes: 60, anchorMinuteOfDay: 540 },
          scheduleSummary: "Every 60 min from 09:00",
          nextDueAt: null,
        },
        {
          id: 2,
          type: "standing",
          title: "Stand up",
          description: "Take a short posture break.",
          enabled: true,
          schedule: { kind: "interval", everyMinutes: 90, anchorMinuteOfDay: 540 },
          scheduleSummary: "Every 90 min from 09:00",
          nextDueAt: "2026-03-20T10:00:00Z",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 1,
          type: "hydration",
          title: "Drink water",
          description: "Refill your glass.",
          enabled: false,
          schedule: { kind: "interval", everyMinutes: 60, anchorMinuteOfDay: 540 },
          scheduleSummary: "Every 60 min from 09:00",
          nextDueAt: null,
        },
      ]);

    setReminderEnabled.mockResolvedValue(undefined);
    deleteReminder.mockResolvedValue(undefined);
    saveReminder.mockResolvedValue(undefined);

    render(<AppShell />);

    expect((await screen.findAllByText("Drink water")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Stand up").length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("button", { name: "Edit" })[1]);
    expect(await screen.findByDisplayValue("Stand up")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Close" }));

    await user.click(screen.getAllByRole("button", { name: "Pause" })[0]);
    await waitFor(() => expect(setReminderEnabled).toHaveBeenCalledWith(1, false));
    await waitFor(() => expect(listReminders).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getAllByText("Stand up").length).toBeGreaterThan(0));

    const standingRowTitle = screen.getByText("Stand up", { selector: "h3" });
    const standingRow = standingRowTitle.closest("article");
    expect(standingRow).not.toBeNull();
    await user.click(within(standingRow as HTMLElement).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(confirmSpy).toHaveBeenCalled());
    await waitFor(() => expect(deleteReminder).toHaveBeenCalledWith(2));
    await waitFor(() => expect(listReminders).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(screen.queryByText("Stand up", { selector: "h3" })).toBeNull());

    confirmSpy.mockRestore();
  });
});