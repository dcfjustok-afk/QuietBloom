use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};

use chrono::{DateTime, Utc};

use crate::domain::reminder::Reminder;
use crate::domain::scheduler::{ReminderRuntimeStatus, SchedulerState};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DueQueueEntry {
    pub reminder_id: i64,
    pub due_at: DateTime<Utc>,
    pub runtime_status: ReminderRuntimeStatus,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct SchedulerRuntimeSnapshot {
    pub due_queue: Vec<DueQueueEntry>,
    pub invalidation_count: u64,
    pub last_rebuilt_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Default)]
pub struct SchedulerRuntime {
    due_queue: Arc<Mutex<Vec<DueQueueEntry>>>,
    invalidation_count: Arc<AtomicU64>,
    last_rebuilt_at: Arc<Mutex<Option<DateTime<Utc>>>>,
}

impl SchedulerRuntime {
    pub fn rebuild_from_state(
        &self,
        reminders: &[Reminder],
        scheduler_state: &SchedulerState,
        rebuilt_at: DateTime<Utc>,
    ) -> Result<Vec<DueQueueEntry>, String> {
        let _ = (reminders, scheduler_state, rebuilt_at);
        let queue = Vec::new();
        *self.due_queue.lock().map_err(|_| "scheduler runtime queue lock poisoned".to_string())? = queue.clone();
        *self
            .last_rebuilt_at
            .lock()
            .map_err(|_| "scheduler runtime rebuild lock poisoned".to_string())? = Some(rebuilt_at);
        Ok(queue)
    }

    pub fn invalidate(&self) {
        let _ = self.invalidation_count.load(Ordering::SeqCst);
    }

    pub fn snapshot(&self) -> Result<SchedulerRuntimeSnapshot, String> {
        Ok(SchedulerRuntimeSnapshot {
            due_queue: self
                .due_queue
                .lock()
                .map_err(|_| "scheduler runtime queue lock poisoned".to_string())?
                .clone(),
            invalidation_count: self.invalidation_count.load(Ordering::SeqCst),
            last_rebuilt_at: *self
                .last_rebuilt_at
                .lock()
                .map_err(|_| "scheduler runtime rebuild lock poisoned".to_string())?,
        })
    }
}

#[cfg(test)]
mod tests {
    use chrono::{Duration, Utc};

    use crate::domain::reminder::Reminder;
    use crate::domain::schedule::{IntervalSchedule, Schedule};
    use crate::domain::scheduler::{ReminderRuntimeStatus, SchedulerState};

    use super::SchedulerRuntime;

    #[test]
    fn scheduler_runtime_rebuilds_ordered_due_queue_from_persisted_inputs() {
        let runtime = SchedulerRuntime::default();
        let now = Utc::now();
        let reminders = vec![
            sample_reminder(7, Some(now + Duration::minutes(20))),
            sample_reminder(3, Some(now + Duration::minutes(10))),
            sample_reminder(11, None),
        ];
        let scheduler_state = sample_scheduler_state(now);

        let queue = runtime
            .rebuild_from_state(&reminders, &scheduler_state, now)
            .unwrap();

        assert_eq!(queue.iter().map(|entry| entry.reminder_id).collect::<Vec<_>>(), vec![3, 7]);
    }

    #[test]
    fn scheduler_runtime_marks_invalidation_after_mutations() {
        let runtime = SchedulerRuntime::default();

        runtime.invalidate();
        let snapshot = runtime.snapshot().unwrap();

        assert_eq!(snapshot.invalidation_count, 1);
    }

    #[test]
    fn scheduler_runtime_snapshot_records_rebuild_time_without_delivery_side_effects() {
        let runtime = SchedulerRuntime::default();
        let now = Utc::now();
        let scheduler_state = sample_scheduler_state(now);
        let reminders = vec![sample_reminder(5, Some(now + Duration::minutes(5)))];

        runtime
            .rebuild_from_state(&reminders, &scheduler_state, now)
            .unwrap();
        let snapshot = runtime.snapshot().unwrap();

        assert_eq!(snapshot.last_rebuilt_at, Some(now));
        assert_eq!(snapshot.due_queue[0].runtime_status, ReminderRuntimeStatus::Scheduled);
    }

    fn sample_reminder(id: i64, next_due_at: Option<chrono::DateTime<Utc>>) -> Reminder {
        Reminder {
            id,
            reminder_type: "standing".to_string(),
            title: format!("Reminder {id}"),
            description: None,
            enabled: next_due_at.is_some(),
            schedule: Schedule::Interval(IntervalSchedule {
                every_minutes: 60,
                anchor_minute_of_day: 540,
                active_window: None,
            }),
            next_due_at,
            base_due_at: next_due_at,
            runtime_status: ReminderRuntimeStatus::Scheduled,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    fn sample_scheduler_state(now: chrono::DateTime<Utc>) -> SchedulerState {
        SchedulerState {
            quiet_hours: None,
            pause_until: Some(now + Duration::minutes(30)),
            last_reconciled_at: Some(now - Duration::minutes(5)),
            updated_at: now,
        }
    }
}