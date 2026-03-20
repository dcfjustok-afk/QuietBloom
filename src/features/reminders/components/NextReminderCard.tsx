import { getReminderTypeMeta } from "../utils/reminder-display";
import type { ReminderSummary } from "../model/reminder";

type NextReminderCardProps = {
  reminder: ReminderSummary | null;
  title: string;
  detail: string;
  onEdit: (reminder: ReminderSummary) => void;
};

export function NextReminderCard({ reminder, title, detail, onEdit }: NextReminderCardProps) {
  if (!reminder) {
    return (
      <section className="surface-card next-reminder-card">
        <div className="card-header">
          <div>
            <p className="app-shell__eyebrow">Next reminder</p>
            <h2 className="card-heading">A calmer day starts with one rhythm.</h2>
            <p className="card-caption">Nothing is scheduled yet, so the dashboard is waiting on your first reminder.</p>
          </div>
        </div>
        <div className="next-reminder-card__timing">
          <span className="next-reminder-card__label">Next due</span>
          <p className="next-reminder-card__time">Whenever you are ready</p>
          <p className="next-reminder-card__meta">Create one reminder to shape the rest of the day.</p>
        </div>
      </section>
    );
  }

  const meta = getReminderTypeMeta(reminder.type);

  return (
    <section className="surface-card next-reminder-card">
      <div className="card-header">
        <div>
          <p className="app-shell__eyebrow">Next reminder</p>
          <div className="type-badge">
            <span className="type-badge__icon" aria-hidden="true">
              {meta.glyph}
            </span>
            <span>{meta.label}</span>
          </div>
        </div>
        <span className={`pill ${reminder.enabled ? "pill--active" : "pill--inactive"}`}>
          {reminder.enabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      <h2 className="next-reminder-card__title">{reminder.title}</h2>
      <p className="next-reminder-card__description">{reminder.description ?? "A gentle prompt ready to support the next part of your day."}</p>

      <div className="next-reminder-card__timing">
        <span className="next-reminder-card__label">Next due</span>
        <p className="next-reminder-card__time">{title}</p>
        <p className="next-reminder-card__meta">{detail}</p>
      </div>

      <button className="button button--text" type="button" onClick={() => onEdit(reminder)}>
        Edit reminder
      </button>
    </section>
  );
}