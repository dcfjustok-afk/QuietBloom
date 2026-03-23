import { getReminderTypeMeta } from "../utils/reminder-display";
import type { ReminderSummary } from "../model/reminder";

type ReminderRowProps = {
  reminder: ReminderSummary;
  timingLabel?: string;
  stateLabel?: string;
  stateTone?: "active" | "inactive" | "neutral";
  nextDueTitle: string;
  nextDueDetail: string;
  onEdit: (reminder: ReminderSummary) => void;
  onToggle: (reminder: ReminderSummary) => void;
  onDelete: (reminder: ReminderSummary) => void;
};

export function ReminderRow({
  reminder,
  timingLabel = "Next due",
  stateLabel = reminder.enabled ? "Enabled" : "Disabled",
  stateTone = reminder.enabled ? "active" : "inactive",
  nextDueTitle,
  nextDueDetail,
  onEdit,
  onToggle,
  onDelete,
}: ReminderRowProps) {
  const meta = getReminderTypeMeta(reminder.type);

  return (
    <article className={`reminder-row ${reminder.enabled ? "" : "reminder-row--disabled"}`.trim()}>
      <div className="reminder-row__copy">
        <div className="type-badge">
          <span className="type-badge__icon" aria-hidden="true">
            {meta.glyph}
          </span>
          <span>{meta.label}</span>
        </div>
        <div>
          <h3 className="reminder-row__title">{reminder.title}</h3>
          <p className="reminder-row__description">{reminder.description ?? "No description yet."}</p>
        </div>
        <span className={`pill reminder-row__state ${stateTone === "active" ? "pill--active" : stateTone === "inactive" ? "pill--inactive" : ""}`.trim()}>
          {stateLabel}
        </span>
      </div>

      <div className="reminder-row__meta">
        <span className="reminder-row__meta-label">Schedule</span>
        <span>{reminder.scheduleSummary}</span>
        <span className="reminder-row__meta-label">{timingLabel}</span>
        <span>
          {nextDueTitle} · {nextDueDetail}
        </span>
      </div>

      <div className="reminder-row__actions">
        <button className="reminder-switch" type="button" onClick={() => onToggle(reminder)}>
          {reminder.enabled ? "Pause" : "Enable"}
        </button>
        <button className="button button--ghost" type="button" onClick={() => onEdit(reminder)}>
          Edit
        </button>
        <button className="button button--ghost-danger" type="button" onClick={() => onDelete(reminder)}>
          Delete
        </button>
      </div>
    </article>
  );
}