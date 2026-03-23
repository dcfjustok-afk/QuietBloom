import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "./AppShell";

const listReminders = vi.fn();
const getSchedulerSnapshot = vi.fn();
const listen = vi.fn();

vi.mock("../features/reminders/api/reminders", () => ({
  deleteReminder: vi.fn(),
  listReminders: (...args: unknown[]) => listReminders(...args),
  saveReminder: vi.fn(),
  setReminderEnabled: vi.fn(),
}));

vi.mock("../features/reminders/api/scheduler", () => ({
  getSchedulerSnapshot: (...args: unknown[]) => getSchedulerSnapshot(...args),
  pauseAllReminders: vi.fn(),
  reconcileScheduler: vi.fn(),
  resumeAllReminders: vi.fn(),
  schedulerChangedEventName: "scheduler:changed",
  saveQuietHours: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: unknown[]) => listen(...args),
}));

const reminder = {
  id: 1,
  type: "hydration" as const,
  title: "Hydrate",
  description: "Take a sip",
  enabled: true,
  schedule: {
    kind: "interval" as const,
    everyMinutes: 45,
    anchorMinuteOfDay: 540,
    activeWindow: null,
  },
  scheduleSummary: "Every 45 min from 09:00",
  nextDueAt: "2026-03-23T03:30:00Z",
};

const snapshot = {
  quietHours: {
    enabled: false,
    startMinuteOfDay: null,
    endMinuteOfDay: null,
    summary: "Off",
    stateLabel: "Allowed now",
  },
  pauseAll: {
    isPaused: false,
    pauseUntil: null,
    summary: "Pause reminders for a short stretch",
    availablePresets: ["30_minutes", "1_hour", "2_hours", "rest_of_today"] as const,
  },
  runtimeSummary: {
    tone: "idle" as const,
    title: "Allowed now",
    detail: "Quiet hours and pause-all stay available here without leaving the dashboard.",
  },
  lastRebuiltAt: "2026-03-23T03:00:00Z",
  invalidationCount: 1,
};

describe("AppShell scheduler invalidation", () => {
  beforeEach(() => {
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: {},
    });

    listReminders.mockReset();
    getSchedulerSnapshot.mockReset();
    listen.mockReset();

    listReminders.mockResolvedValue([reminder]);
    getSchedulerSnapshot.mockResolvedValue(snapshot);
    listen.mockResolvedValue(vi.fn());
  });

  it("refreshes after scheduler invalidation", async () => {
    render(<AppShell />);

    await waitFor(() => expect(listReminders).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getSchedulerSnapshot).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(listen).toHaveBeenCalledWith("scheduler:changed", expect.any(Function)));

    const handler = listen.mock.calls[0][1] as (event: { payload: unknown }) => Promise<void>;

    listReminders.mockResolvedValue([
      {
        ...reminder,
        nextDueAt: "2026-03-23T03:45:00Z",
      },
    ]);
    getSchedulerSnapshot.mockResolvedValue({
      ...snapshot,
      invalidationCount: 2,
    });

    await act(async () => {
      await handler({
        payload: {
          invalidationCount: 2,
          reason: "resume",
        },
      });
    });

    await waitFor(() => expect(listReminders).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(getSchedulerSnapshot).toHaveBeenCalledTimes(2));
  });
});