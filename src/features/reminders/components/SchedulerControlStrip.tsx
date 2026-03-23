import { useEffect, useState } from "react";

import { formatMinutesOfDay, parseTimeString, type LocalTimeWindow } from "../model/reminder";
import { type PauseAllPreset, type SchedulerSnapshot } from "../model/scheduler";

type SchedulerControlStripProps = {
  snapshot: SchedulerSnapshot;
  isSavingQuietHours: boolean;
  isUpdatingPauseAll: boolean;
  onSaveQuietHours: (quietHours: LocalTimeWindow | null) => Promise<void>;
  onPauseAll: (preset: PauseAllPreset) => Promise<void>;
  onResumeNow: () => Promise<void>;
};

const pausePresetOptions: Array<{ value: PauseAllPreset; label: string }> = [
  { value: "30_minutes", label: "30 min" },
  { value: "1_hour", label: "1 hour" },
  { value: "2_hours", label: "2 hours" },
  { value: "rest_of_today", label: "Rest of today" },
];

function getDraftFromSnapshot(snapshot: SchedulerSnapshot) {
  return {
    enabled: snapshot.quietHours.enabled,
    start: snapshot.quietHours.startMinuteOfDay !== null ? formatMinutesOfDay(snapshot.quietHours.startMinuteOfDay) : "22:00",
    end: snapshot.quietHours.endMinuteOfDay !== null ? formatMinutesOfDay(snapshot.quietHours.endMinuteOfDay) : "08:00",
  };
}

export function SchedulerControlStrip({
  snapshot,
  isSavingQuietHours,
  isUpdatingPauseAll,
  onSaveQuietHours,
  onPauseAll,
  onResumeNow,
}: SchedulerControlStripProps) {
  const [quietHoursOpen, setQuietHoursOpen] = useState(false);
  const [pauseMenuOpen, setPauseMenuOpen] = useState(false);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(snapshot.quietHours.enabled);
  const [quietHoursStart, setQuietHoursStart] = useState(getDraftFromSnapshot(snapshot).start);
  const [quietHoursEnd, setQuietHoursEnd] = useState(getDraftFromSnapshot(snapshot).end);
  const [quietHoursError, setQuietHoursError] = useState<string | null>(null);

  useEffect(() => {
    if (quietHoursOpen) {
      return;
    }

    const draft = getDraftFromSnapshot(snapshot);
    setQuietHoursEnabled(draft.enabled);
    setQuietHoursStart(draft.start);
    setQuietHoursEnd(draft.end);
    setQuietHoursError(null);
  }, [quietHoursOpen, snapshot]);

  function openQuietHoursEditor() {
    const draft = getDraftFromSnapshot(snapshot);
    setQuietHoursEnabled(draft.enabled);
    setQuietHoursStart(draft.start);
    setQuietHoursEnd(draft.end);
    setQuietHoursError(null);
    setQuietHoursOpen(true);
  }

  function closeQuietHoursEditor() {
    setQuietHoursOpen(false);
    setQuietHoursError(null);
  }

  async function handleSaveQuietHours() {
    if (!quietHoursEnabled) {
      await onSaveQuietHours(null);
      setQuietHoursOpen(false);
      return;
    }

    const startMinuteOfDay = parseTimeString(quietHoursStart);
    const endMinuteOfDay = parseTimeString(quietHoursEnd);

    if (startMinuteOfDay === endMinuteOfDay) {
      setQuietHoursError("Start and end must be different.");
      return;
    }

    setQuietHoursError(null);
    await onSaveQuietHours({ startMinuteOfDay, endMinuteOfDay });
    setQuietHoursOpen(false);
  }

  async function handlePausePreset(preset: PauseAllPreset) {
    await onPauseAll(preset);
    setPauseMenuOpen(false);
  }

  const showRuntimeNote = snapshot.runtimeSummary.tone !== "idle";

  return (
    <section className="surface-card scheduler-strip" aria-label="Scheduler controls" role="region">
      <div className="scheduler-strip__tiles">
        <article className="scheduler-strip__tile scheduler-strip__tile--quiet">
          <div className="scheduler-strip__copy">
            <p className="scheduler-strip__label">Quiet hours</p>
            <p className="scheduler-strip__summary">{snapshot.quietHours.enabled ? snapshot.quietHours.summary : "Off for now"}</p>
            <p className="scheduler-strip__state">{snapshot.quietHours.stateLabel}</p>
          </div>
          <div className="scheduler-strip__actions">
            <button className="button button--ghost" type="button" onClick={openQuietHoursEditor}>
              Edit quiet hours
            </button>
          </div>

          {quietHoursOpen ? (
            <div className="scheduler-panel" role="group" aria-label="Quiet hours editor">
              <label className="scheduler-toggle">
                <input
                  checked={quietHoursEnabled}
                  type="checkbox"
                  onChange={(event) => setQuietHoursEnabled(event.target.checked)}
                />
                <span>Use quiet hours</span>
              </label>

              <div className="scheduler-panel__grid">
                <label className="field-stack">
                  <span className="field-label">Quiet hours start</span>
                  <input
                    aria-label="Quiet hours start"
                    className="text-input"
                    type="time"
                    value={quietHoursStart}
                    disabled={!quietHoursEnabled}
                    onChange={(event) => setQuietHoursStart(event.target.value)}
                  />
                </label>

                <label className="field-stack">
                  <span className="field-label">Quiet hours end</span>
                  <input
                    aria-label="Quiet hours end"
                    className="text-input"
                    type="time"
                    value={quietHoursEnd}
                    disabled={!quietHoursEnabled}
                    onChange={(event) => setQuietHoursEnd(event.target.value)}
                  />
                </label>
              </div>

              <p className="scheduler-panel__helper">22:00 to 08:00 spans overnight in your local time.</p>
              {quietHoursError ? <p className="field-error">{quietHoursError}</p> : null}

              <div className="scheduler-panel__actions">
                <button className="button button--ghost" type="button" onClick={closeQuietHoursEditor}>
                  Cancel
                </button>
                <button
                  className="button button--primary"
                  type="button"
                  disabled={isSavingQuietHours}
                  onClick={() => {
                    void handleSaveQuietHours();
                  }}
                >
                  {isSavingQuietHours ? "Saving..." : "Save quiet hours"}
                </button>
              </div>
            </div>
          ) : null}
        </article>

        <article className="scheduler-strip__tile scheduler-strip__tile--pause">
          <div className="scheduler-strip__copy">
            <p className="scheduler-strip__label">Pause all</p>
            <p className="scheduler-strip__summary">{snapshot.pauseAll.summary}</p>
            <p className="scheduler-strip__state">{snapshot.pauseAll.isPaused ? "Reminders will recompute from current rules when the pause ends." : "Pause reminders for a short stretch without leaving the dashboard."}</p>
          </div>

          <div className="scheduler-strip__actions scheduler-strip__actions--pause">
            {!snapshot.pauseAll.isPaused ? (
              <button
                className="button button--ghost"
                type="button"
                disabled={isUpdatingPauseAll}
                onClick={() => setPauseMenuOpen((value) => !value)}
              >
                Pause presets
              </button>
            ) : (
              <button
                className="button button--ghost"
                type="button"
                disabled={isUpdatingPauseAll}
                onClick={() => {
                  void onResumeNow();
                }}
              >
                Resume now
              </button>
            )}
          </div>

          {pauseMenuOpen && !snapshot.pauseAll.isPaused ? (
            <div className="scheduler-panel scheduler-panel--menu" role="group" aria-label="Pause all presets">
              {pausePresetOptions.map((preset) => (
                <button
                  key={preset.value}
                  className="scheduler-menu__item"
                  type="button"
                  disabled={isUpdatingPauseAll}
                  onClick={() => {
                    void handlePausePreset(preset.value);
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          ) : null}
        </article>
      </div>

      {showRuntimeNote ? (
        <div className={`scheduler-runtime scheduler-runtime--${snapshot.runtimeSummary.tone}`}>
          <p className="scheduler-runtime__title">{snapshot.runtimeSummary.title}</p>
          <p className="scheduler-runtime__detail">{snapshot.runtimeSummary.detail}</p>
        </div>
      ) : null}
    </section>
  );
}