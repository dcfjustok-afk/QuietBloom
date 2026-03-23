import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "../../../app/AppShell";
import type { SchedulerSnapshot } from "../model/scheduler";
import { SchedulerControlStrip } from "./SchedulerControlStrip";

const listReminders = vi.fn();
const getSchedulerSnapshot = vi.fn();

vi.mock("../api/reminders", () => ({
  listReminders: (...args: unknown[]) => listReminders(...args),
  saveReminder: vi.fn(),
  deleteReminder: vi.fn(),
  setReminderEnabled: vi.fn(),
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

describe("SchedulerControlStrip", () => {
  beforeEach(() => {
    listReminders.mockReset();
    getSchedulerSnapshot.mockReset();
  });

  it("renders below the existing top bar without adding a new route", async () => {
    listReminders.mockResolvedValue([]);
    getSchedulerSnapshot.mockResolvedValue(schedulerSnapshot);

    render(<AppShell />);

    await screen.findByText("Quiet hours");
    const title = screen.getByRole("heading", {
      name: "A calm dashboard for the rhythms that keep you steady.",
    });

    const topBar = title.closest("header");
    const controlStrip = screen.getByRole("region", { name: "Scheduler controls" });

    expect(topBar).not.toBeNull();
    expect(controlStrip).toBeDefined();
    expect(screen.getAllByRole("button", { name: "New reminder" }).length).toBeGreaterThan(0);
  });

  it("pauses reminders with exactly four presets and a resume action", async () => {
    const user = userEvent.setup();
    const onPauseAll = vi.fn().mockResolvedValue(undefined);
    const onResumeNow = vi.fn().mockResolvedValue(undefined);

    const { rerender } = render(
      <SchedulerControlStrip
        isSavingQuietHours={false}
        isUpdatingPauseAll={false}
        onPauseAll={onPauseAll}
        onResumeNow={onResumeNow}
        onSaveQuietHours={vi.fn().mockResolvedValue(undefined)}
        snapshot={schedulerSnapshot}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Pause presets" }));

    const menu = screen.getByRole("group", { name: "Pause all presets" });
    expect(within(menu).getByRole("button", { name: "30 min" })).toBeDefined();
    expect(within(menu).getByRole("button", { name: "1 hour" })).toBeDefined();
    expect(within(menu).getByRole("button", { name: "2 hours" })).toBeDefined();
    expect(within(menu).getByRole("button", { name: "Rest of today" })).toBeDefined();

    await user.click(within(menu).getByRole("button", { name: "1 hour" }));

    await waitFor(() => expect(onPauseAll).toHaveBeenCalledWith("1_hour"));

    rerender(
      <SchedulerControlStrip
        isSavingQuietHours={false}
        isUpdatingPauseAll={false}
        onPauseAll={onPauseAll}
        onResumeNow={onResumeNow}
        onSaveQuietHours={vi.fn().mockResolvedValue(undefined)}
        snapshot={{
          ...schedulerSnapshot,
          pauseAll: {
            ...schedulerSnapshot.pauseAll,
            isPaused: true,
            pauseUntil: "2026-03-23T07:00:00Z",
            summary: "Paused until 15:00",
          },
          runtimeSummary: {
            tone: "paused",
            title: "Paused until 15:00",
            detail: "Resume now or let reminders recompute from the current rules when the pause ends.",
          },
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Resume now" }));
    await waitFor(() => expect(onResumeNow).toHaveBeenCalledTimes(1));
  });

  it("uses explicit-save quiet-hours editing and blocks identical boundaries", async () => {
    const user = userEvent.setup();
    const onSaveQuietHours = vi.fn().mockResolvedValue(undefined);

    render(
      <SchedulerControlStrip
        isSavingQuietHours={false}
        isUpdatingPauseAll={false}
        onPauseAll={vi.fn().mockResolvedValue(undefined)}
        onResumeNow={vi.fn().mockResolvedValue(undefined)}
        onSaveQuietHours={onSaveQuietHours}
        snapshot={schedulerSnapshot}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Edit quiet hours" }));
    fireEvent.change(screen.getByLabelText("Quiet hours start"), { target: { value: "08:00" } });
    fireEvent.change(screen.getByLabelText("Quiet hours end"), { target: { value: "08:00" } });
    await user.click(screen.getByRole("button", { name: "Save quiet hours" }));

    expect(onSaveQuietHours).not.toHaveBeenCalled();
    expect(screen.getByText("Start and end must be different.")) .toBeDefined();
    expect(screen.getByText("22:00 to 08:00 spans overnight in your local time.")).toBeDefined();
  });
});