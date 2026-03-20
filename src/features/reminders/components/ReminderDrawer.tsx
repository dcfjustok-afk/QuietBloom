import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  createCustomFixedTimeSchedule,
  createCustomIntervalSchedule,
  defaultReminderInput,
  fixedTimeSchedulePresets,
  intervalSchedulePresets,
  reminderFormSchema,
  type ReminderFormValues,
} from "../form/reminder-form-schema";
import {
  formatMinutesOfDay,
  parseTimeString,
  reminderTypes,
  type FixedTimeSchedule,
  type IntervalSchedule,
  type ReminderSummary,
  type SaveReminderInput,
} from "../model/reminder";
import { formatDrawerTimingSummary, getReminderTypeMeta } from "../utils/reminder-display";

const weekdayOptions = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
] as const;

type ReminderDrawerProps = {
  open: boolean;
  reminder: ReminderSummary | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (input: SaveReminderInput) => Promise<void>;
};

function toFormValues(reminder: ReminderSummary | null): ReminderFormValues {
  if (!reminder) {
    return defaultReminderInput;
  }

  return {
    id: reminder.id,
    type: reminder.type,
    title: reminder.title,
    description: reminder.description ?? "",
    enabled: reminder.enabled,
    schedule: reminder.schedule,
  };
}

function cloneIntervalSchedule(schedule: IntervalSchedule): IntervalSchedule {
  return {
    kind: "interval",
    everyMinutes: schedule.everyMinutes,
    anchorMinuteOfDay: schedule.anchorMinuteOfDay,
  };
}

function cloneFixedTimeSchedule(schedule: FixedTimeSchedule): FixedTimeSchedule {
  return {
    kind: "fixed_time",
    weekdays: [...schedule.weekdays],
    times: [...schedule.times],
  };
}

function clonePresetInterval(id: (typeof intervalSchedulePresets)[number]["id"]): IntervalSchedule {
  const preset = intervalSchedulePresets.find((item) => item.id === id) ?? intervalSchedulePresets[2];
  return cloneIntervalSchedule(preset.schedule);
}

function clonePresetFixedTime(id: (typeof fixedTimeSchedulePresets)[number]["id"]): FixedTimeSchedule {
  const preset = fixedTimeSchedulePresets.find((item) => item.id === id) ?? fixedTimeSchedulePresets[0];
  return cloneFixedTimeSchedule(preset.schedule);
}

function findIntervalPresetId(schedule: IntervalSchedule) {
  return intervalSchedulePresets.find(
    (preset) =>
      preset.schedule.everyMinutes === schedule.everyMinutes &&
      preset.schedule.anchorMinuteOfDay === schedule.anchorMinuteOfDay,
  )?.id;
}

function findFixedTimePresetId(schedule: FixedTimeSchedule) {
  const weekdays = [...schedule.weekdays].sort((left, right) => left - right);
  const times = [...schedule.times].sort((left, right) => left - right);

  return fixedTimeSchedulePresets.find((preset) => {
    const presetWeekdays = [...preset.schedule.weekdays].sort((left, right) => left - right);
    const presetTimes = [...preset.schedule.times].sort((left, right) => left - right);

    return JSON.stringify(presetWeekdays) === JSON.stringify(weekdays) && JSON.stringify(presetTimes) === JSON.stringify(times);
  })?.id;
}

function getScheduleErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  if ("message" in error && typeof error.message === "string") {
    return error.message;
  }

  if ("weekdays" in error) {
    return getScheduleErrorMessage(error.weekdays);
  }

  if ("times" in error) {
    return getScheduleErrorMessage(error.times);
  }

  if ("everyMinutes" in error) {
    return getScheduleErrorMessage(error.everyMinutes);
  }

  if ("anchorMinuteOfDay" in error) {
    return getScheduleErrorMessage(error.anchorMinuteOfDay);
  }

  return null;
}

export function ReminderDrawer({ open, reminder, isSaving, onClose, onSave }: ReminderDrawerProps) {
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
  const [showIntervalAdvanced, setShowIntervalAdvanced] = useState(false);
  const [showFixedTimeAdvanced, setShowFixedTimeAdvanced] = useState(false);
  const {
    formState,
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
  } = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderFormSchema),
    defaultValues: toFormValues(reminder),
  });

  useEffect(() => {
    const nextValues = toFormValues(reminder);
    reset(nextValues);
    setShowUnsavedPrompt(false);
    setShowIntervalAdvanced(
      nextValues.schedule.kind === "interval" && !findIntervalPresetId(nextValues.schedule),
    );
    setShowFixedTimeAdvanced(
      nextValues.schedule.kind === "fixed_time" && !findFixedTimePresetId(nextValues.schedule),
    );
  }, [reminder, open, reset]);

  const values = watch();
  const schedule = values.schedule;
  const scheduleError = getScheduleErrorMessage(formState.errors.schedule);
  const isDirty = formState.isDirty || Object.keys(formState.dirtyFields).length > 0;

  if (!open) {
    return null;
  }

  const title = reminder ? "Edit reminder" : "New reminder";
  const subtitle = reminder
    ? "Make one clear change, then save it deliberately."
    : "Start with a gentle default rhythm and keep the rest of the dashboard in view.";

  async function submit(valuesToSave: ReminderFormValues) {
    await onSave({
      ...valuesToSave,
      description: valuesToSave.description,
    });
    setShowUnsavedPrompt(false);
    reset(valuesToSave);
    onClose();
  }

  function requestClose() {
    if (isDirty) {
      setShowUnsavedPrompt(true);
      return;
    }

    onClose();
  }

  function setSchedule(nextSchedule: ReminderFormValues["schedule"]) {
    setValue("schedule", nextSchedule, { shouldDirty: true, shouldValidate: true });
  }

  function setScheduleMode(mode: "interval" | "fixed_time") {
    if (mode === values.schedule.kind) {
      return;
    }

    if (mode === "interval") {
      setSchedule(clonePresetInterval("every-60"));
      setShowIntervalAdvanced(false);
      return;
    }

    setSchedule(clonePresetFixedTime("weekdays-1030"));
    setShowFixedTimeAdvanced(false);
  }

  function selectIntervalPreset(id: (typeof intervalSchedulePresets)[number]["id"] | "custom") {
    if (id === "custom") {
      setShowIntervalAdvanced(true);
      if (schedule.kind !== "interval") {
        setSchedule(createCustomIntervalSchedule());
      }
      return;
    }

    setSchedule(clonePresetInterval(id));
    setShowIntervalAdvanced(false);
  }

  function selectFixedTimePreset(id: (typeof fixedTimeSchedulePresets)[number]["id"] | "custom") {
    if (id === "custom") {
      setShowFixedTimeAdvanced(true);
      if (schedule.kind !== "fixed_time") {
        setSchedule(createCustomFixedTimeSchedule());
      }
      return;
    }

    setSchedule(clonePresetFixedTime(id));
    setShowFixedTimeAdvanced(false);
  }

  function updateIntervalDuration(part: "hours" | "minutes", rawValue: string) {
    const intervalSchedule = schedule.kind === "interval" ? schedule : createCustomIntervalSchedule();
    const currentHours = Math.floor(intervalSchedule.everyMinutes / 60);
    const currentMinutes = intervalSchedule.everyMinutes % 60;
    const nextHours = part === "hours" ? Number(rawValue || 0) : currentHours;
    const nextMinutes = part === "minutes" ? Number(rawValue || 0) : currentMinutes;

    setSchedule({
      kind: "interval",
      everyMinutes: Math.max(0, nextHours) * 60 + Math.max(0, nextMinutes),
      anchorMinuteOfDay: intervalSchedule.anchorMinuteOfDay,
    });
  }

  function updateIntervalAnchor(value: string) {
    const intervalSchedule = schedule.kind === "interval" ? schedule : createCustomIntervalSchedule();
    setSchedule({
      ...intervalSchedule,
      anchorMinuteOfDay: parseTimeString(value),
    });
  }

  function toggleWeekday(weekday: number) {
    const fixedTimeSchedule = schedule.kind === "fixed_time" ? schedule : createCustomFixedTimeSchedule();
    const nextWeekdays = fixedTimeSchedule.weekdays.includes(weekday)
      ? fixedTimeSchedule.weekdays.filter((value) => value !== weekday)
      : [...fixedTimeSchedule.weekdays, weekday].sort((left, right) => left - right);

    setSchedule({
      ...fixedTimeSchedule,
      weekdays: nextWeekdays,
    });
  }

  function updateFixedTime(index: number, value: string) {
    const fixedTimeSchedule = schedule.kind === "fixed_time" ? schedule : createCustomFixedTimeSchedule();
    const nextTimes = [...fixedTimeSchedule.times];
    nextTimes[index] = parseTimeString(value);
    setSchedule({
      ...fixedTimeSchedule,
      times: [...new Set(nextTimes)].sort((left, right) => left - right),
    });
  }

  function addFixedTime() {
    const fixedTimeSchedule = schedule.kind === "fixed_time" ? schedule : createCustomFixedTimeSchedule();
    const lastTime = fixedTimeSchedule.times[fixedTimeSchedule.times.length - 1] ?? 630;
    const nextTime = Math.min(lastTime + 120, 1380);
    setSchedule({
      ...fixedTimeSchedule,
      times: [...fixedTimeSchedule.times, nextTime],
    });
  }

  function removeFixedTime(index: number) {
    const fixedTimeSchedule = schedule.kind === "fixed_time" ? schedule : createCustomFixedTimeSchedule();
    if (fixedTimeSchedule.times.length === 1) {
      return;
    }

    setSchedule({
      ...fixedTimeSchedule,
      times: fixedTimeSchedule.times.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  const activeIntervalPreset = schedule.kind === "interval" ? findIntervalPresetId(schedule) : undefined;
  const activeFixedTimePreset = schedule.kind === "fixed_time" ? findFixedTimePresetId(schedule) : undefined;
  const intervalHours = schedule.kind === "interval" ? Math.floor(schedule.everyMinutes / 60) : 1;
  const intervalMinutes = schedule.kind === "interval" ? schedule.everyMinutes % 60 : 30;

  return (
    <>
      <div className="drawer-backdrop" />
      <aside className="drawer-panel" aria-label={title}>
        <div className="drawer-header">
          <div>
            <h2 className="drawer-title">{title}</h2>
            <p className="drawer-subtitle">{subtitle}</p>
          </div>
          <button aria-label="Close drawer" className="drawer-close" type="button" onClick={requestClose}>
            ×
          </button>
        </div>

        <form className="drawer-body" onSubmit={handleSubmit(submit)}>
          <section className="field-group">
            <span className="field-label">Reminder type</span>
            <div className="type-selector">
              {reminderTypes.map((type) => {
                const meta = getReminderTypeMeta(type);
                const selected = values.type === type;
                return (
                  <button
                    key={type}
                    className={`type-selector__option ${selected ? "type-selector__option--selected" : ""}`.trim()}
                    type="button"
                    onClick={() => setValue("type", type, { shouldDirty: true })}
                  >
                    <span className="type-badge__icon" aria-hidden="true">
                      {meta.glyph}
                    </span>
                    <span>{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="field-group">
            <label className="field-label" htmlFor="reminder-title">
              Title
            </label>
            <input className="text-input" id="reminder-title" {...register("title")} />
            {formState.errors.title ? <span className="field-error">{formState.errors.title.message}</span> : null}
          </section>

          <section className="field-group">
            <label className="field-label" htmlFor="reminder-description">
              Description
            </label>
            <textarea className="text-area" id="reminder-description" {...register("description")} />
          </section>

          <section className="field-group">
            <span className="field-label">Timing</span>
            <div className="schedule-mode-switch" role="tablist" aria-label="Schedule mode">
              <button
                className={`schedule-mode-switch__option ${schedule.kind === "interval" ? "schedule-mode-switch__option--selected" : ""}`.trim()}
                type="button"
                onClick={() => setScheduleMode("interval")}
              >
                Interval
              </button>
              <button
                className={`schedule-mode-switch__option ${schedule.kind === "fixed_time" ? "schedule-mode-switch__option--selected" : ""}`.trim()}
                type="button"
                onClick={() => setScheduleMode("fixed_time")}
              >
                Fixed time
              </button>
            </div>

            {schedule.kind === "interval" ? (
              <>
                <div className="preset-grid" aria-label="Interval presets">
                  {intervalSchedulePresets.map((preset) => (
                    <button
                      key={preset.id}
                      className={`preset-chip ${activeIntervalPreset === preset.id && !showIntervalAdvanced ? "preset-chip--selected" : ""}`.trim()}
                      type="button"
                      onClick={() => selectIntervalPreset(preset.id)}
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    className={`preset-chip ${showIntervalAdvanced || !activeIntervalPreset ? "preset-chip--selected" : ""}`.trim()}
                    type="button"
                    onClick={() => selectIntervalPreset("custom")}
                  >
                    Custom interval
                  </button>
                </div>

                {showIntervalAdvanced || !activeIntervalPreset ? (
                  <div className="advanced-panel">
                    <div className="advanced-panel__header">
                      <h3 className="advanced-panel__title">Advanced interval</h3>
                      <button className="button button--text" type="button" onClick={() => setShowIntervalAdvanced(false)}>
                        Hide advanced
                      </button>
                    </div>
                    <div className="advanced-grid advanced-grid--interval">
                      <label className="field-stack">
                        <span className="field-label">Hours</span>
                        <input
                          className="text-input"
                          min={0}
                          type="number"
                          value={intervalHours}
                          onChange={(event) => updateIntervalDuration("hours", event.target.value)}
                        />
                      </label>
                      <label className="field-stack">
                        <span className="field-label">Minutes</span>
                        <input
                          className="text-input"
                          min={0}
                          max={59}
                          type="number"
                          value={intervalMinutes}
                          onChange={(event) => updateIntervalDuration("minutes", event.target.value)}
                        />
                      </label>
                      <label className="field-stack field-stack--wide">
                        <span className="field-label">Start reference time</span>
                        <input
                          className="text-input"
                          type="time"
                          value={formatMinutesOfDay(schedule.anchorMinuteOfDay)}
                          onChange={(event) => updateIntervalAnchor(event.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div className="preset-grid" aria-label="Fixed time presets">
                  {fixedTimeSchedulePresets.map((preset) => (
                    <button
                      key={preset.id}
                      className={`preset-chip ${activeFixedTimePreset === preset.id && !showFixedTimeAdvanced ? "preset-chip--selected" : ""}`.trim()}
                      type="button"
                      onClick={() => selectFixedTimePreset(preset.id)}
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    className={`preset-chip ${showFixedTimeAdvanced || !activeFixedTimePreset ? "preset-chip--selected" : ""}`.trim()}
                    type="button"
                    onClick={() => selectFixedTimePreset("custom")}
                  >
                    Custom times
                  </button>
                </div>

                {showFixedTimeAdvanced || !activeFixedTimePreset ? (
                  <div className="advanced-panel">
                    <div className="advanced-panel__header">
                      <h3 className="advanced-panel__title">Advanced fixed times</h3>
                      <button className="button button--text" type="button" onClick={() => setShowFixedTimeAdvanced(false)}>
                        Hide advanced
                      </button>
                    </div>

                    <div className="weekday-grid" aria-label="Weekday selector">
                      {weekdayOptions.map((weekday) => (
                        <button
                          key={weekday.value}
                          className={`weekday-chip ${schedule.weekdays.includes(weekday.value) ? "weekday-chip--selected" : ""}`.trim()}
                          type="button"
                          aria-pressed={schedule.weekdays.includes(weekday.value)}
                          onClick={() => toggleWeekday(weekday.value)}
                        >
                          {weekday.label}
                        </button>
                      ))}
                    </div>

                    <div className="time-input-list">
                      {schedule.times.map((time, index) => (
                        <div key={`${time}-${index}`} className="time-input-row">
                          <label className="field-stack field-stack--wide">
                            <span className="field-label">Time {index + 1}</span>
                            <input
                              className="text-input"
                              type="time"
                              value={formatMinutesOfDay(time)}
                              onChange={(event) => updateFixedTime(index, event.target.value)}
                            />
                          </label>
                          <button
                            className="button button--ghost"
                            type="button"
                            onClick={() => removeFixedTime(index)}
                            disabled={schedule.times.length === 1}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>

                    <button className="button button--ghost" type="button" onClick={addFixedTime}>
                      Add time
                    </button>
                  </div>
                ) : null}
              </>
            )}

            <div className="timing-summary">
              <p className="timing-summary__title">Schedule preview</p>
              <p className="timing-summary__value">{formatDrawerTimingSummary({ schedule })}</p>
            </div>
            {scheduleError ? <span className="field-error">{scheduleError}</span> : null}
          </section>

          <section className="field-group">
            <label className="drawer-toggle">
              <input type="checkbox" {...register("enabled")} />
              <span>Enabled on save</span>
            </label>
          </section>
        </form>

        {showUnsavedPrompt ? (
          <div className="drawer-prompt" role="dialog" aria-modal="true" aria-label="Unsaved changes prompt">
            <h3 className="drawer-prompt__title">You have unsaved changes</h3>
            <p className="drawer-prompt__copy">Keep editing, discard the draft, or save this reminder before closing the drawer.</p>
            <div className="drawer-prompt__actions">
              <button className="button button--ghost" type="button" onClick={() => setShowUnsavedPrompt(false)}>
                Continue editing
              </button>
              <button className="button button--ghost-danger" type="button" onClick={onClose}>
                Discard changes
              </button>
              <button className="button button--primary" type="button" onClick={handleSubmit(submit)}>
                Save reminder
              </button>
            </div>
          </div>
        ) : null}

        <div className="drawer-footer">
          <button className="button button--ghost" type="button" onClick={requestClose}>
            Close
          </button>
          <button className="button button--primary" type="submit" onClick={handleSubmit(submit)} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save reminder"}
          </button>
        </div>
      </aside>
    </>
  );
}