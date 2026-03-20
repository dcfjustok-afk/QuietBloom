import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ReminderDrawer } from "./ReminderDrawer";
import type { ReminderSummary } from "../model/reminder";

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
  it("creates reminder", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <ReminderDrawer isSaving={false} onClose={vi.fn()} onSave={onSave} open reminder={null} />,
    );

    await user.click(screen.getByRole("button", { name: "Hydration" }));
    await user.type(screen.getByLabelText("Title"), "Drink water");
    await user.type(screen.getByLabelText("Description"), "Refill the glass before your next meeting.");
    await user.click(screen.getAllByRole("button", { name: "Save reminder" })[0]);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        type: "hydration",
        title: "Drink water",
        description: "Refill the glass before your next meeting.",
        enabled: true,
        schedule: { kind: "interval", everyMinutes: 60, anchorMinuteOfDay: 540 },
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
});