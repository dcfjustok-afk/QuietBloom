use chrono::{DateTime, Duration, Local, Timelike, Utc};
use serde::{Deserialize, Serialize};

use crate::domain::schedule::build_local_candidate;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LocalTimeWindow {
    pub start_minute_of_day: u16,
    pub end_minute_of_day: u16,
}

impl LocalTimeWindow {
    pub fn validate(&self) -> Result<(), String> {
        if self.start_minute_of_day > 1439 || self.end_minute_of_day > 1439 {
            return Err("activeWindow minutes must be between 0 and 1439".to_string());
        }

        if self.start_minute_of_day == self.end_minute_of_day {
            return Err("activeWindow start and end must differ".to_string());
        }

        Ok(())
    }

    pub fn contains_utc(&self, candidate: DateTime<Utc>) -> bool {
        let local = candidate.with_timezone(&Local);
        let minute_of_day = (local.hour() * 60 + local.minute()) as u16;

        if self.start_minute_of_day < self.end_minute_of_day {
            minute_of_day >= self.start_minute_of_day && minute_of_day < self.end_minute_of_day
        } else {
            minute_of_day >= self.start_minute_of_day || minute_of_day < self.end_minute_of_day
        }
    }

    pub fn defer_utc(&self, candidate: DateTime<Utc>) -> Result<DateTime<Utc>, String> {
        let local = candidate.with_timezone(&Local);
        let minute_of_day = (local.hour() * 60 + local.minute()) as u16;
        let start_hour = u32::from(self.start_minute_of_day / 60);
        let start_minute = u32::from(self.start_minute_of_day % 60);

        let target_date = if self.start_minute_of_day < self.end_minute_of_day {
            if minute_of_day < self.start_minute_of_day {
                local.date_naive()
            } else {
                local.date_naive() + Duration::days(1)
            }
        } else {
            local.date_naive()
        };

        Ok(build_local_candidate(target_date, start_hour, start_minute)?.with_timezone(&Utc))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum ReminderRuntimeStatus {
    #[default]
    Scheduled,
    DeferredByActiveWindow,
    DeferredByQuietHours,
    Paused,
    CatchUp,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct EffectiveNextDue {
    pub base_due_at: DateTime<Utc>,
    pub effective_due_at: DateTime<Utc>,
    pub runtime_status: ReminderRuntimeStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SchedulerState {
    pub quiet_hours: Option<LocalTimeWindow>,
    pub pause_until: Option<DateTime<Utc>>,
    pub last_reconciled_at: Option<DateTime<Utc>>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Default)]
pub struct SchedulerContext {
    pub quiet_hours: Option<LocalTimeWindow>,
    pub pause_until: Option<DateTime<Utc>>,
}

impl SchedulerContext {
    pub fn from_state(state: &SchedulerState) -> Self {
        Self {
            quiet_hours: state.quiet_hours.clone(),
            pause_until: state.pause_until,
        }
    }

    pub fn apply(
        &self,
        base_due_at: DateTime<Utc>,
        active_window: Option<&LocalTimeWindow>,
    ) -> Result<EffectiveNextDue, String> {
        let mut effective_due_at = base_due_at;
        let mut runtime_status = ReminderRuntimeStatus::Scheduled;

        if let Some(pause_until) = self.pause_until {
            if pause_until > effective_due_at {
                effective_due_at = pause_until;
                runtime_status = ReminderRuntimeStatus::Paused;
            }
        }

        for _ in 0..4 {
            if let Some(window) = self.quiet_hours.as_ref() {
                if window.contains_utc(effective_due_at) {
                    effective_due_at = window.defer_utc(effective_due_at)?;
                    runtime_status = ReminderRuntimeStatus::DeferredByQuietHours;
                    continue;
                }
            }

            if let Some(window) = active_window {
                if !window.contains_utc(effective_due_at) {
                    effective_due_at = window.defer_utc(effective_due_at)?;
                    runtime_status = ReminderRuntimeStatus::DeferredByActiveWindow;
                    continue;
                }
            }

            break;
        }

        Ok(EffectiveNextDue {
            base_due_at,
            effective_due_at,
            runtime_status,
        })
    }
}

#[cfg(test)]
mod tests {
    use chrono::{DateTime, Local, LocalResult, NaiveDate, TimeZone, Utc};

    use crate::domain::reminder::Reminder;
    use crate::domain::schedule::{FixedTimeSchedule, IntervalSchedule, Schedule};

    use super::{LocalTimeWindow, ReminderRuntimeStatus, SchedulerContext};

    fn local_utc(year: i32, month: u32, day: u32, hour: u32, minute: u32) -> DateTime<Utc> {
        let naive = NaiveDate::from_ymd_opt(year, month, day)
            .unwrap()
            .and_hms_opt(hour, minute, 0)
            .unwrap();
        let local = match Local.from_local_datetime(&naive) {
            LocalResult::Single(value) => value,
            LocalResult::Ambiguous(first, _) => first,
            LocalResult::None => panic!("local test time could not be resolved"),
        };
        local.with_timezone(&Utc)
    }

    #[test]
    fn active_window_defers_interval_due_to_same_day_start() {
        let schedule = Schedule::Interval(IntervalSchedule {
            every_minutes: 60,
            anchor_minute_of_day: 540,
            active_window: Some(LocalTimeWindow {
                start_minute_of_day: 600,
                end_minute_of_day: 960,
            }),
        });

        let decision = schedule
            .compute_effective_next_due(local_utc(2026, 3, 23, 8, 5), &SchedulerContext::default())
            .unwrap();

        assert_eq!(decision.base_due_at, local_utc(2026, 3, 23, 9, 0));
        assert_eq!(decision.effective_due_at, local_utc(2026, 3, 23, 10, 0));
        assert_eq!(decision.runtime_status, ReminderRuntimeStatus::DeferredByActiveWindow);
    }

    #[test]
    fn active_window_defers_cross_midnight_fixed_time_to_same_night_start() {
        let schedule = Schedule::FixedTime(FixedTimeSchedule {
            weekdays: vec![1],
            times: vec!["21:00".to_string()],
            active_window: Some(LocalTimeWindow {
                start_minute_of_day: 1320,
                end_minute_of_day: 480,
            }),
        });

        let decision = schedule
            .compute_effective_next_due(local_utc(2026, 3, 23, 20, 0), &SchedulerContext::default())
            .unwrap();

        assert_eq!(decision.base_due_at, local_utc(2026, 3, 23, 21, 0));
        assert_eq!(decision.effective_due_at, local_utc(2026, 3, 23, 22, 0));
        assert_eq!(decision.runtime_status, ReminderRuntimeStatus::DeferredByActiveWindow);
    }

    #[test]
    fn active_window_reminder_read_model_carries_scheduler_metadata() {
        let reminder = Reminder {
            id: 7,
            reminder_type: "mindful_break".to_string(),
            title: "Step away".to_string(),
            description: Some("Take five calm minutes".to_string()),
            enabled: true,
            schedule: Schedule::Interval(IntervalSchedule {
                every_minutes: 60,
                anchor_minute_of_day: 540,
                active_window: Some(LocalTimeWindow {
                    start_minute_of_day: 600,
                    end_minute_of_day: 960,
                }),
            }),
            next_due_at: Some(local_utc(2026, 3, 23, 10, 0)),
            base_due_at: Some(local_utc(2026, 3, 23, 9, 0)),
            runtime_status: ReminderRuntimeStatus::DeferredByActiveWindow,
            created_at: local_utc(2026, 3, 23, 8, 0),
            updated_at: local_utc(2026, 3, 23, 8, 5),
        };

        let json = serde_json::to_value(&reminder).unwrap();

        assert_eq!(json.get("baseDueAt").and_then(|value| value.as_str()), Some("2026-03-23T01:00:00Z"));
        assert_eq!(json.get("runtimeStatus").and_then(|value| value.as_str()), Some("deferred_by_active_window"));
    }
}