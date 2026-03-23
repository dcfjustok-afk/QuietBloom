use chrono::{DateTime, Datelike, Duration, Local, LocalResult, NaiveDate, TimeZone, Utc};
use serde::{Deserialize, Serialize};

use crate::domain::scheduler::{EffectiveNextDue, LocalTimeWindow, SchedulerContext};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Schedule {
    Interval(IntervalSchedule),
    FixedTime(FixedTimeSchedule),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct IntervalSchedule {
    pub every_minutes: u32,
    pub anchor_minute_of_day: u32,
    #[serde(default)]
    pub active_window: Option<LocalTimeWindow>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FixedTimeSchedule {
    pub weekdays: Vec<u8>,
    pub times: Vec<String>,
    #[serde(default)]
    pub active_window: Option<LocalTimeWindow>,
}

impl Schedule {
    pub fn kind(&self) -> &'static str {
        match self {
            Self::Interval(_) => "interval",
            Self::FixedTime(_) => "fixed_time",
        }
    }

    pub fn validate(&self) -> Result<(), String> {
        match self {
            Self::Interval(schedule) => schedule.validate(),
            Self::FixedTime(schedule) => schedule.validate(),
        }
    }

    #[allow(dead_code)]
    pub fn compute_next_due(&self, now: DateTime<Utc>) -> Result<DateTime<Utc>, String> {
        Ok(self
            .compute_effective_next_due(now, &SchedulerContext::default())?
            .effective_due_at)
    }

    pub fn compute_base_next_due(&self, now: DateTime<Utc>) -> Result<DateTime<Utc>, String> {
        self.validate()?;

        match self {
            Self::Interval(schedule) => schedule.compute_next_due(now),
            Self::FixedTime(schedule) => schedule.compute_next_due(now),
        }
    }

    pub fn compute_effective_next_due(
        &self,
        now: DateTime<Utc>,
        context: &SchedulerContext,
    ) -> Result<EffectiveNextDue, String> {
        self.validate()?;
        let base_due_at = self.compute_base_next_due(now)?;
        context.apply(base_due_at, self.active_window())
    }

    pub fn active_window(&self) -> Option<&LocalTimeWindow> {
        match self {
            Self::Interval(schedule) => schedule.active_window.as_ref(),
            Self::FixedTime(schedule) => schedule.active_window.as_ref(),
        }
    }
}

impl IntervalSchedule {
    fn validate(&self) -> Result<(), String> {
        if !(5..=1440).contains(&self.every_minutes) {
            return Err("interval everyMinutes must be between 5 and 1440".to_string());
        }

        if self.anchor_minute_of_day > 1439 {
            return Err("anchorMinuteOfDay must be between 0 and 1439".to_string());
        }

        if let Some(active_window) = &self.active_window {
            active_window.validate()?;
        }

        Ok(())
    }

    fn compute_next_due(&self, now: DateTime<Utc>) -> Result<DateTime<Utc>, String> {
        let every_minutes = i64::from(self.every_minutes);
        let now_local = now.with_timezone(&Local);
        let mut day_offset = 0_i64;

        loop {
            let date = now_local.date_naive() + Duration::days(day_offset);
            let midnight = date
                .and_hms_opt(0, 0, 0)
                .ok_or_else(|| "failed to derive local midnight".to_string())?;
            let anchored = midnight + Duration::minutes(i64::from(self.anchor_minute_of_day));
            let candidate = resolve_local_datetime(anchored)?;

            if day_offset == 0 {
                if candidate > now_local {
                    return Ok(candidate.with_timezone(&Utc));
                }

                let elapsed = now_local.signed_duration_since(candidate).num_minutes();
                let steps = elapsed.div_euclid(every_minutes) + 1;
                let next = candidate.naive_local() + Duration::minutes(steps * every_minutes);
                let next_candidate = resolve_local_datetime(next)?;
                if next_candidate.date_naive() == date {
                    return Ok(next_candidate.with_timezone(&Utc));
                }
            } else {
                return Ok(candidate.with_timezone(&Utc));
            }

            day_offset += 1;
        }
    }
}

impl FixedTimeSchedule {
    fn validate(&self) -> Result<(), String> {
        if self.weekdays.is_empty() {
            return Err("fixed_time weekdays cannot be empty".to_string());
        }

        if self.times.is_empty() {
            return Err("fixed_time times cannot be empty".to_string());
        }

        for weekday in &self.weekdays {
            if !(1..=7).contains(weekday) {
                return Err("weekdays must use ISO values from 1 to 7".to_string());
            }
        }

        for time in &self.times {
            parse_time(time)?;
        }

        if let Some(active_window) = &self.active_window {
            active_window.validate()?;
        }

        Ok(())
    }

    fn compute_next_due(&self, now: DateTime<Utc>) -> Result<DateTime<Utc>, String> {
        let now_local = now.with_timezone(&Local);
        let mut weekdays = self.weekdays.clone();
        weekdays.sort_unstable();
        weekdays.dedup();

        let mut parsed_times = self
            .times
            .iter()
            .map(|value| parse_time(value))
            .collect::<Result<Vec<_>, _>>()?;
        parsed_times.sort_unstable();
        parsed_times.dedup();

        for day_offset in 0..14_i64 {
            let date = now_local.date_naive() + Duration::days(day_offset);
            let weekday = date.weekday().number_from_monday() as u8;
            if !weekdays.contains(&weekday) {
                continue;
            }

            for (hour, minute) in &parsed_times {
                let candidate = build_local_candidate(date, *hour, *minute)?;
                if candidate > now_local {
                    return Ok(candidate.with_timezone(&Utc));
                }
            }
        }

        Err("failed to compute next fixed_time occurrence".to_string())
    }
}

pub(crate) fn build_local_candidate(
    date: NaiveDate,
    hour: u32,
    minute: u32,
) -> Result<DateTime<Local>, String> {
    let candidate = date
        .and_hms_opt(hour, minute, 0)
        .ok_or_else(|| "invalid local schedule time".to_string())?;
    resolve_local_datetime(candidate)
}

pub(crate) fn resolve_local_datetime(naive: chrono::NaiveDateTime) -> Result<DateTime<Local>, String> {
    match Local.from_local_datetime(&naive) {
        LocalResult::Single(value) => Ok(value),
        LocalResult::Ambiguous(first, _) => Ok(first),
        LocalResult::None => Err("local time could not be resolved".to_string()),
    }
}

fn parse_time(value: &str) -> Result<(u32, u32), String> {
    let trimmed = value.trim();
    let (hour, minute) = trimmed
        .split_once(':')
        .ok_or_else(|| "times must use HH:MM".to_string())?;

    let hour = hour
        .parse::<u32>()
        .map_err(|_| "times must use HH:MM".to_string())?;
    let minute = minute
        .parse::<u32>()
        .map_err(|_| "times must use HH:MM".to_string())?;

    if hour > 23 || minute > 59 {
        return Err("times must use a 24-hour HH:MM format".to_string());
    }

    Ok((hour, minute))
}

#[cfg(test)]
mod tests {
    use super::{FixedTimeSchedule, IntervalSchedule, Schedule};
    use chrono::{Datelike, NaiveDate, Utc};

    fn local_utc(year: i32, month: u32, day: u32, hour: u32, minute: u32) -> chrono::DateTime<Utc> {
        let date = NaiveDate::from_ymd_opt(year, month, day).unwrap();
        let local = super::build_local_candidate(date, hour, minute).unwrap();
        local.with_timezone(&Utc)
    }

    #[test]
    fn rejects_invalid_interval_bounds() {
        let schedule = Schedule::Interval(IntervalSchedule {
            every_minutes: 4,
            anchor_minute_of_day: 0,
            active_window: None,
        });

        assert!(schedule.validate().is_err());
    }

    #[test]
    fn rejects_empty_fixed_time_arrays() {
        let schedule = Schedule::FixedTime(FixedTimeSchedule {
            weekdays: vec![],
            times: vec![],
            active_window: None,
        });

        assert!(schedule.validate().is_err());
    }

    #[test]
    fn computes_next_due_for_interval_same_day_slot() {
        let schedule = Schedule::Interval(IntervalSchedule {
            every_minutes: 30,
            anchor_minute_of_day: 540,
            active_window: None,
        });

        let now = local_utc(2026, 3, 20, 9, 10);
        let due = schedule.compute_next_due(now).unwrap();
        let expected = local_utc(2026, 3, 20, 9, 30);

        assert_eq!(due, expected);
    }

    #[test]
    fn computes_next_due_for_interval_next_day_rollover() {
        let schedule = Schedule::Interval(IntervalSchedule {
            every_minutes: 120,
            anchor_minute_of_day: 1320,
            active_window: None,
        });

        let now = local_utc(2026, 3, 20, 23, 30);
        let due = schedule.compute_next_due(now).unwrap();
        let expected = local_utc(2026, 3, 21, 22, 0);

        assert_eq!(due, expected);
    }

    #[test]
    fn computes_next_due_for_fixed_time_future_weekday() {
        let monday = NaiveDate::from_ymd_opt(2026, 3, 23).unwrap();
        assert_eq!(monday.weekday().number_from_monday(), 1);

        let schedule = Schedule::FixedTime(FixedTimeSchedule {
            weekdays: vec![1, 3, 5],
            times: vec!["10:30".to_string(), "15:00".to_string()],
            active_window: None,
        });

        let now = local_utc(2026, 3, 23, 10, 45);
        let due = schedule.compute_next_due(now).unwrap();
        let expected = local_utc(2026, 3, 23, 15, 0);

        assert_eq!(due, expected);
    }

    #[test]
    fn computes_next_due_for_fixed_time_next_matching_day() {
        let schedule = Schedule::FixedTime(FixedTimeSchedule {
            weekdays: vec![2],
            times: vec!["10:30".to_string()],
            active_window: None,
        });

        let now = local_utc(2026, 3, 23, 16, 0);
        let due = schedule.compute_next_due(now).unwrap();
        let expected = local_utc(2026, 3, 24, 10, 30);

        assert_eq!(due, expected);
    }
}