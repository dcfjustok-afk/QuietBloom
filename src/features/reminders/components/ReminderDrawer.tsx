import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  defaultReminderInput,
  reminderFormSchema,
  type ReminderFormValues,
} from "../form/reminder-form-schema";
import { reminderTypes, type ReminderSummary, type SaveReminderInput } from "../model/reminder";
import { formatDrawerTimingSummary, getReminderTypeMeta } from "../utils/reminder-display";

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

export function ReminderDrawer({ open, reminder, isSaving, onClose, onSave }: ReminderDrawerProps) {
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
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
    reset(toFormValues(reminder));
    setShowUnsavedPrompt(false);
  }, [reminder, open, reset]);

  const values = watch();
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
            <div className="timing-summary">
              <p className="timing-summary__title">Current timing</p>
              <p className="timing-summary__value">{formatDrawerTimingSummary({ schedule: values.schedule })}</p>
            </div>
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