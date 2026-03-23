import { formatReminderNextDue } from "../utils/reminder-display";
import { ReminderRow } from "./ReminderRow";
import type { ReminderSummary } from "../model/reminder";

type ReminderListSectionProps = {
  reminders: ReminderSummary[];
  onCreate: () => void;
  onEdit: (reminder: ReminderSummary) => void;
  onToggle: (reminder: ReminderSummary) => void;
  onDelete: (reminder: ReminderSummary) => void;
};

export function ReminderListSection({
  reminders,
  onCreate,
  onEdit,
  onToggle,
  onDelete,
}: ReminderListSectionProps) {
  return (
    <section className="surface-card section-card">
      <div className="section-header">
        <div>
          <h2 className="section-title">Your reminders</h2>
          <p className="section-copy">Adjust what repeats through your day without leaving the dashboard.</p>
        </div>
        <button className="button button--ghost" type="button" onClick={onCreate}>
          New reminder
        </button>
      </div>

      {reminders.length === 0 ? (
        <div className="empty-state">
          <p>No reminders yet. Start with one gentle prompt, then build the rest of the day around it.</p>
        </div>
      ) : (
        <div className="reminder-list">
          {reminders.map((reminder) => {
            const nextDue = formatReminderNextDue(reminder);
            return (
              <ReminderRow
                key={reminder.id}
                reminder={reminder}
                nextDueDetail={nextDue.detail}
                nextDueTitle={nextDue.title}
                stateLabel={nextDue.stateLabel}
                stateTone={nextDue.stateTone}
                timingLabel={nextDue.timingLabel}
                onDelete={onDelete}
                onEdit={onEdit}
                onToggle={onToggle}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}