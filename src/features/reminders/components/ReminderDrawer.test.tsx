import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "../../../app/AppShell";
import { ReminderDrawer } from "./ReminderDrawer";
import type { ReminderSummary } from "../model/reminder";

const listReminders = vi.fn();
const saveReminder = vi.fn();
const deleteReminder = vi.fn();
const setReminderEnabled = vi.fn();

vi.mock("../api/reminders", () => ({
  listReminders: (...args: unknown[]) => listReminders(...args),
  saveReminder: (...args: unknown[]) => saveReminder(...args),
  deleteReminder: (...args: unknown[]) => deleteReminder(...args),
  setReminderEnabled: (...args: unknown[]) => setReminderEnabled(...args),
}));

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
        schedule: { kind: "fixed_time", weekdays: [1, 2, 3, 4, 5], times: [630, 900] },
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
        schedule: { kind: "fixed_time", weekdays: [1, 2, 3, 4, 5], times: [630] },
      });
    });
    await waitFor(() => expect(listReminders).toHaveBeenCalledTimes(2));

    const updatedHero = screen.getByText("Next reminder").closest("section");
    expect(updatedHero).not.toBeNull();
    await waitFor(() => expect(within(updatedHero as HTMLElement).getByText("Stand up")).toBeDefined());
  });
});