import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";

import {
  deleteReminder,
  listReminders,
  saveReminder,
  setReminderEnabled,
} from "../features/reminders/api/reminders";
import {
  getSchedulerSnapshot,
  pauseAllReminders,
  reconcileScheduler,
  resumeAllReminders,
  schedulerChangedEventName,
  saveQuietHours,
} from "../features/reminders/api/scheduler";
import { ReminderDrawer } from "../features/reminders/components/ReminderDrawer";
import { ReminderListSection } from "../features/reminders/components/ReminderListSection";
import { NextReminderCard } from "../features/reminders/components/NextReminderCard";
import { SchedulerControlStrip } from "../features/reminders/components/SchedulerControlStrip";
import { TodayOverviewCard } from "../features/reminders/components/TodayOverviewCard";
import type { LocalTimeWindow, ReminderSummary, SaveReminderInput } from "../features/reminders/model/reminder";
import type { PauseAllPreset, SchedulerSnapshot } from "../features/reminders/model/scheduler";
import {
  countDueToday,
  formatHeroNextDue,
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
  const [schedulerSnapshot, setSchedulerSnapshot] = useState<SchedulerSnapshot | null>(null);
  const [savingQuietHoursState, setSavingQuietHoursState] = useState(false);
  const [updatingPauseAll, setUpdatingPauseAll] = useState(false);
  const isRecoveringRef = useRef(false);

  function hasTauriRuntime() {
    return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  }

  useEffect(() => {
    void refreshDashboard(true);
  }, []);

  useEffect(() => {
    if (!hasTauriRuntime()) {
      return undefined;
    }

    let disposed = false;
    let unlisten: undefined | (() => void);

    void listen(schedulerChangedEventName, async () => {
      await refreshDashboard();
    }).then((cleanup) => {
      if (disposed) {
        cleanup();
        return;
      }

      unlisten = cleanup;
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    if (!hasTauriRuntime()) {
      return undefined;
    }

    function requestRecovery() {
      if (isRecoveringRef.current) {
        return;
      }

      isRecoveringRef.current = true;
      void reconcileScheduler("resume")
        .catch(() => undefined)
        .finally(() => {
          isRecoveringRef.current = false;
        });
    }

    function handleFocus() {
      requestRecovery();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        requestRecovery();
      }
    }

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  async function refreshDashboard(showLoading = false) {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const [nextReminders, nextSchedulerSnapshot] = await Promise.all([
        listReminders(),
        getSchedulerSnapshot(),
      ]);
      setReminders(sortReminders(nextReminders));
      setSchedulerSnapshot(nextSchedulerSnapshot);
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load reminders.");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
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
      await refreshDashboard();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleReminder(reminder: ReminderSummary) {
    await setReminderEnabled(reminder.id, !reminder.enabled);
    await refreshDashboard();
  }

  async function handleDeleteReminder(reminder: ReminderSummary) {
    if (!window.confirm(`Delete ${reminder.title}?`)) {
      return;
    }

    await deleteReminder(reminder.id);
    await refreshDashboard();
  }

  async function handleSaveQuietHours(quietHours: LocalTimeWindow | null) {
    setSavingQuietHoursState(true);
    try {
      await saveQuietHours(quietHours);
      await refreshDashboard();
    } finally {
      setSavingQuietHoursState(false);
    }
  }

  async function handlePauseAll(preset: PauseAllPreset) {
    setUpdatingPauseAll(true);
    try {
      await pauseAllReminders(preset);
      await refreshDashboard();
    } finally {
      setUpdatingPauseAll(false);
    }
  }

  async function handleResumeNow() {
    setUpdatingPauseAll(true);
    try {
      await resumeAllReminders();
      await refreshDashboard();
    } finally {
      setUpdatingPauseAll(false);
    }
  }

  function getSchedulerFact(snapshot: SchedulerSnapshot | null): string | null {
    if (!snapshot) {
      return null;
    }

    if (snapshot.pauseAll.isPaused) {
      return snapshot.pauseAll.summary;
    }

    if (snapshot.quietHours.enabled) {
      return `Quiet hours ${snapshot.quietHours.summary}`;
    }

    return null;
  }

  const nextReminder = reminders.find((reminder) => reminder.enabled && reminder.nextDueAt) ?? null;
  const nextDue = formatHeroNextDue(nextReminder);
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
            <p className="app-shell__status">Today holds {enabledCount} active reminders with {dueTodayCount} upcoming touchpoints still in view.</p>
          </div>
          <div className="app-shell__actions">
            <button className="button button--primary" type="button" onClick={openNewReminder}>
              New reminder
            </button>
          </div>
        </header>

        {loading ? <div className="app-shell__feedback">Loading today&apos;s reminder rhythm…</div> : null}
        {error ? <div className="app-shell__feedback">{error}</div> : null}

        {!loading && !error && schedulerSnapshot ? (
          <div className="dashboard">
            <SchedulerControlStrip
              isSavingQuietHours={savingQuietHoursState}
              isUpdatingPauseAll={updatingPauseAll}
              onPauseAll={handlePauseAll}
              onResumeNow={handleResumeNow}
              onSaveQuietHours={handleSaveQuietHours}
              snapshot={schedulerSnapshot}
            />

            <section className="hero-grid">
              <NextReminderCard
                detail={nextDue.detail}
                onEdit={openEditReminder}
                reminder={nextReminder}
                stateLabel={nextDue.stateLabel}
                stateTone={nextDue.stateTone}
                timingLabel={nextDue.timingLabel}
                title={nextDue.title}
              />
              <TodayOverviewCard
                dueTodayCount={dueTodayCount}
                enabledCount={enabledCount}
                scheduleMix={scheduleMix}
                schedulerFact={getSchedulerFact(schedulerSnapshot)}
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