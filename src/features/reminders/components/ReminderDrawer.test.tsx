import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "../../../app/AppShell";
import { ReminderDrawer } from "./ReminderDrawer";
import type { ReminderSummary } from "../model/reminder";
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

const existingReminder: ReminderSummary = {
  id: 7,
  type: "standing",
  title: "Stand up",
  description: "Roll your shoulders and reset your posture.",
  enabled: true,
  schedule: { kind: "interval", everyMinutes: 60, anchorMinuteOfDay: 540 },
  scheduleSummary: "Every 60 min from 09:00",
  nextDueAt: "2026-03-20T09:00:00Z",
};

describe("ReminderDrawer", () => {
  beforeEach(() => {
    listReminders.mockReset();
    saveReminder.mockReset();
    deleteReminder.mockReset();
    setReminderEnabled.mockReset();
    getSchedulerSnapshot.mockReset();
    getSchedulerSnapshot.mockResolvedValue(schedulerSnapshot);
  });

  it("creates a fixed-time reminder from a preset", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <ReminderDrawer isSaving={false} onClose={vi.fn()} onSave={onSave} open reminder={null} />,
    );

    await user.click(screen.getByRole("button", { name: "Hydration" }));
  await user.click(screen.getByRole("button", { name: "Fixed time" }));
  await user.click(screen.getByRole("button", { name: "Weekdays 10:30 + 15:00" }));
    await user.type(screen.getByLabelText("Title"), "Drink water");
    await user.type(screen.getByLabelText("Description"), "Refill the glass before your next meeting.");
    await user.click(screen.getAllByRole("button", { name: "Save reminder" })[0]);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        type: "hydration",
        title: "Drink water",
        description: "Refill the glass before your next meeting.",
        enabled: true,
        schedule: { kind: "fixed_time", weekdays: [1, 2, 3, 4, 5], times: [630, 900], activeWindow: null },
      });
    });
  });

  it("submits custom interval values from advanced controls", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <ReminderDrawer isSaving={false} onClose={vi.fn()} onSave={onSave} open reminder={null} />,
    );

    await user.click(screen.getByRole("button", { name: "Custom interval" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Hours" }), { target: { value: "1" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Minutes" }), { target: { value: "35" } });
    fireEvent.change(screen.getByLabelText("Start reference time"), { target: { value: "08:15" } });
    await user.type(screen.getByLabelText("Title"), "Walk briefly");
    await user.click(screen.getAllByRole("button", { name: "Save reminder" })[0]);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        type: "hydration",
        title: "Walk briefly",
        description: "",
        enabled: true,
        schedule: { kind: "interval", everyMinutes: 95, anchorMinuteOfDay: 495 },
      });
    });
  });

  it("shows the unsaved-change prompt", async () => {
    const user = userEvent.setup();

    render(
      <ReminderDrawer isSaving={false} onClose={vi.fn()} onSave={vi.fn().mockResolvedValue(undefined)} open reminder={null} />,
    );

    await user.click(screen.getByRole("button", { name: "Standing" }));
    await user.type(screen.getByLabelText("Title"), "Stand up");
    await user.click(screen.getByLabelText("Close drawer"));

    await waitFor(() => expect(screen.getByRole("dialog", { name: "Unsaved changes prompt" })).toBeDefined());
    expect(screen.getByRole("button", { name: "Continue editing" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Discard changes" })).toBeDefined();
    expect(screen.getAllByRole("button", { name: "Save reminder" }).length).toBeGreaterThan(1);
  });

  it("preserves the reminder id when editing", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <ReminderDrawer isSaving={false} onClose={vi.fn()} onSave={onSave} open reminder={existingReminder} />,
    );

    const title = screen.getByLabelText("Title");
    await user.clear(title);
    await user.type(title, "Stand and breathe");
    await user.click(screen.getAllByRole("button", { name: "Save reminder" })[0]);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        id: 7,
        type: "standing",
        title: "Stand and breathe",
        description: "Roll your shoulders and reset your posture.",
        enabled: true,
        schedule: { kind: "interval", everyMinutes: 60, anchorMinuteOfDay: 540 },
      });
    });
  });

  it("saves an active window from the drawer advanced schedule area", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <ReminderDrawer isSaving={false} onClose={vi.fn()} onSave={onSave} open reminder={null} />,
    );

    await user.click(screen.getByRole("button", { name: "Custom interval" }));
    await user.type(screen.getByLabelText("Title"), "Deep work reset");
    await user.click(screen.getByLabelText("Use allowed hours"));
    fireEvent.change(screen.getByLabelText("Allowed hours start"), { target: { value: "21:00" } });
    fireEvent.change(screen.getByLabelText("Allowed hours end"), { target: { value: "06:00" } });
    await user.click(screen.getAllByRole("button", { name: "Save reminder" })[0]);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        type: "hydration",
        title: "Deep work reset",
        description: "",
        enabled: true,
        schedule: {
          kind: "interval",
          everyMinutes: 60,
          anchorMinuteOfDay: 540,
          activeWindow: { startMinuteOfDay: 1260, endMinuteOfDay: 360 },
        },
      });
    });
  });

  it("blocks active window save when both boundaries are identical", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <ReminderDrawer isSaving={false} onClose={vi.fn()} onSave={onSave} open reminder={null} />,
    );

    await user.type(screen.getByLabelText("Title"), "Deep work reset");
    await user.click(screen.getByLabelText("Use allowed hours"));
    fireEvent.change(screen.getByLabelText("Allowed hours start"), { target: { value: "08:00" } });
    fireEvent.change(screen.getByLabelText("Allowed hours end"), { target: { value: "08:00" } });
    await user.click(screen.getAllByRole("button", { name: "Save reminder" })[0]);

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Allowed hours must start and end at different times")).toBeDefined();
    expect(screen.getByText("21:00 to 06:00 works across midnight.")) .toBeDefined();
  });

  it("updates the dashboard after editing a schedule", async () => {
    const user = userEvent.setup();

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
          nextDueAt: "2026-03-20T11:00:00Z",
        },
        {
          id: 2,
          type: "standing",
          title: "Stand up",
          description: "Reset your posture.",
          enabled: true,
          schedule: { kind: "interval", everyMinutes: 90, anchorMinuteOfDay: 540 },
          scheduleSummary: "Every 90 min from 09:00",
          nextDueAt: "2026-03-20T12:00:00Z",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 2,
          type: "standing",
          title: "Stand up",
          description: "Reset your posture.",
          enabled: true,
          schedule: { kind: "fixed_time", weekdays: [1, 2, 3, 4, 5], times: [630] },
          scheduleSummary: "Mon, Tue, Wed, Thu, Fri at 10:30",
          nextDueAt: "2026-03-20T10:30:00Z",
        },
        {
          id: 1,
          type: "hydration",
          title: "Drink water",
          description: "Refill your glass.",
          enabled: true,
          schedule: { kind: "interval", everyMinutes: 60, anchorMinuteOfDay: 540 },
          scheduleSummary: "Every 60 min from 09:00",
          nextDueAt: "2026-03-20T11:00:00Z",
        },
      ]);

    saveReminder.mockResolvedValue(undefined);

    render(<AppShell />);

    const initialHero = (await screen.findByText("Next reminder")).closest("section");
    expect(initialHero).not.toBeNull();
    expect(within(initialHero as HTMLElement).getByText("Drink water")).toBeDefined();

    const standingRowTitle = screen.getByText("Stand up", { selector: "h3" });
    const standingRow = standingRowTitle.closest("article");
    expect(standingRow).not.toBeNull();

    await user.click(within(standingRow as HTMLElement).getByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Fixed time" }));
    await user.click(screen.getByRole("button", { name: "Weekdays 10:30" }));
    await user.click(screen.getAllByRole("button", { name: "Save reminder" })[0]);

    await waitFor(() => {
      expect(saveReminder).toHaveBeenCalledWith({
        id: 2,
        type: "standing",
        title: "Stand up",
        description: "Reset your posture.",
        enabled: true,
        schedule: { kind: "fixed_time", weekdays: [1, 2, 3, 4, 5], times: [630], activeWindow: null },
      });
    });
    await waitFor(() => expect(listReminders).toHaveBeenCalledTimes(2));

    const updatedHero = screen.getByText("Next reminder").closest("section");
    expect(updatedHero).not.toBeNull();
    await waitFor(() => expect(within(updatedHero as HTMLElement).getByText("Stand up")).toBeDefined());
  });
});