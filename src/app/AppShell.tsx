import { useEffect, useState } from "react";

import {
  deleteReminder,
  listReminders,
  saveReminder,
  setReminderEnabled,
} from "../features/reminders/api/reminders";
import { ReminderDrawer } from "../features/reminders/components/ReminderDrawer";
import { ReminderListSection } from "../features/reminders/components/ReminderListSection";
import { NextReminderCard } from "../features/reminders/components/NextReminderCard";
import { TodayOverviewCard } from "../features/reminders/components/TodayOverviewCard";
import type { ReminderSummary, SaveReminderInput } from "../features/reminders/model/reminder";
import {
  countDueToday,
  formatNextDue,
  sortReminders,
  summarizeScheduleMix,
} from "../features/reminders/utils/reminder-display";

export function AppShell() {
  const [reminders, setReminders] = useState<ReminderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeReminder, setActiveReminder] = useState<ReminderSummary | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void refreshReminders();
  }, []);

  async function refreshReminders() {
    try {
      const nextReminders = await listReminders();
      setReminders(sortReminders(nextReminders));
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load reminders.");
    } finally {
      setLoading(false);
    }
  }

  function openNewReminder() {
    setActiveReminder(null);
    setDrawerOpen(true);
  }

  function openEditReminder(reminder: ReminderSummary) {
    setActiveReminder(reminder);
    setDrawerOpen(true);
  }

  async function handleSaveReminder(input: SaveReminderInput) {
    setSaving(true);
    try {
      await saveReminder(input);
      await refreshReminders();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleReminder(reminder: ReminderSummary) {
    await setReminderEnabled(reminder.id, !reminder.enabled);
    await refreshReminders();
  }

  async function handleDeleteReminder(reminder: ReminderSummary) {
    if (!window.confirm(`Delete ${reminder.title}?`)) {
      return;
    }

    await deleteReminder(reminder.id);
    await refreshReminders();
  }

  const nextReminder = reminders.find((reminder) => reminder.enabled) ?? null;
  const nextDue = formatNextDue(nextReminder?.nextDueAt ?? null);
  const enabledCount = reminders.filter((reminder) => reminder.enabled).length;
  const dueTodayCount = countDueToday(reminders.filter((reminder) => reminder.enabled));
  const scheduleMix = summarizeScheduleMix(reminders);

  return (
    <main className="app-shell">
      <div className="app-shell__frame">
        <header className="app-shell__topbar">
          <div className="app-shell__identity">
            <span className="app-shell__eyebrow">QuietBloom</span>
            <h1 className="app-shell__title">A calm dashboard for the rhythms that keep you steady.</h1>
            <p className="app-shell__status">Today holds {enabledCount} active reminders across hydration, movement, and eye-rest habits.</p>
          </div>
          <div className="app-shell__actions">
            <button className="button button--primary" type="button" onClick={openNewReminder}>
              New reminder
            </button>
          </div>
        </header>

        {loading ? <div className="app-shell__feedback">Loading today&apos;s reminder rhythm…</div> : null}
        {error ? <div className="app-shell__feedback">{error}</div> : null}

        {!loading && !error ? (
          <div className="dashboard">
            <section className="hero-grid">
              <NextReminderCard
                detail={nextDue.detail}
                onEdit={openEditReminder}
                reminder={nextReminder}
                title={nextDue.title}
              />
              <TodayOverviewCard
                dueTodayCount={dueTodayCount}
                enabledCount={enabledCount}
                scheduleMix={scheduleMix}
                totalCount={reminders.length}
              />
            </section>

            <ReminderListSection
              reminders={reminders}
              onCreate={openNewReminder}
              onDelete={(reminder) => {
                void handleDeleteReminder(reminder);
              }}
              onEdit={openEditReminder}
              onToggle={(reminder) => {
                void handleToggleReminder(reminder);
              }}
            />
          </div>
        ) : null}

        <ReminderDrawer
          isSaving={saving}
          onClose={() => setDrawerOpen(false)}
          onSave={handleSaveReminder}
          open={drawerOpen}
          reminder={activeReminder}
        />
      </div>
    </main>
  );
}