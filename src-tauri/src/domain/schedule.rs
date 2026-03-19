use chrono::{DateTime, Datelike, Duration, Local, LocalResult, NaiveDate, TimeZone, Utc};
use serde::{Deserialize, Serialize};

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
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FixedTimeSchedule {
    pub weekdays: Vec<u8>,
    pub times: Vec<String>,
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

    pub fn compute_next_due(&self, now: DateTime<Utc>) -> Result<DateTime<Utc>, String> {
        self.validate()?;

        match self {
            Self::Interval(schedule) => schedule.compute_next_due(now),
            Self::FixedTime(schedule) => schedule.compute_next_due(now),
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

        Ok(())
    }

    fn compute_next_due(&self, now: DateTime<Utc>) -> Result<DateTime<Utc>, String> {
        let every_minutes = i64::from(self.every_minutes);
        let now_local = now.with_timezone(&Local);
        let midnight = now_local
            .date_naive()
            .and_hms_opt(0, 0, 0)
            .ok_or_else(|| "failed to derive local midnight".to_string())?;
        let anchored = midnight + Duration::minutes(i64::from(self.anchor_minute_of_day));
        let mut candidate = resolve_local_datetime(anchored)?;

        if candidate <= now_local {
            let elapsed = now_local.signed_duration_since(candidate).num_minutes();
            let steps = elapsed.div_euclid(every_minutes) + 1;
            let next = candidate.naive_local() + Duration::minutes(steps * every_minutes);
            candidate = resolve_local_datetime(next)?;
        }

        Ok(candidate.with_timezone(&Utc))
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

        for day_offset in 0..8_i64 {
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

fn build_local_candidate(
    date: NaiveDate,
    hour: u32,
    minute: u32,
) -> Result<DateTime<Local>, String> {
    let candidate = date
        .and_hms_opt(hour, minute, 0)
        .ok_or_else(|| "invalid local schedule time".to_string())?;
    resolve_local_datetime(candidate)
}

fn resolve_local_datetime(naive: chrono::NaiveDateTime) -> Result<DateTime<Local>, String> {
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
    use chrono::{Duration, Utc};

    #[test]
    fn rejects_invalid_interval_bounds() {
        let schedule = Schedule::Interval(IntervalSchedule {
            every_minutes: 4,
            anchor_minute_of_day: 0,
        });

        assert!(schedule.validate().is_err());
    }

    #[test]
    fn rejects_empty_fixed_time_arrays() {
        let schedule = Schedule::FixedTime(FixedTimeSchedule {
            weekdays: vec![],
            times: vec![],
        });

        assert!(schedule.validate().is_err());
    }

    #[test]
    fn computes_future_interval_due() {
        let schedule = Schedule::Interval(IntervalSchedule {
            every_minutes: 120,
            anchor_minute_of_day: 0,
        });

        let due = schedule.compute_next_due(Utc::now()).unwrap();

        assert!(due > Utc::now() - Duration::seconds(1));
    }
}