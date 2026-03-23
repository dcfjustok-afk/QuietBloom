use chrono::{DateTime, Duration, Local, Timelike, Utc};
use serde::{Deserialize, Serialize};

use crate::domain::schedule::build_local_candidate;
use crate::domain::scheduler::{LocalTimeWindow, SchedulerState};
use crate::persistence::scheduler_state::SchedulerStateRepository;
use crate::runtime::scheduler::{SchedulerRuntime, SchedulerRuntimeSnapshot};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum PauseAllPreset {
    #[serde(rename = "30_minutes")]
    ThirtyMinutes,
    #[serde(rename = "1_hour")]
    OneHour,
    #[serde(rename = "2_hours")]
    TwoHours,
    #[serde(rename = "rest_of_today")]
    RestOfToday,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SchedulerSnapshot {
    pub quiet_hours: QuietHoursSnapshot,
    pub pause_all: PauseAllSnapshot,
    pub runtime_summary: RuntimeSummarySnapshot,
    pub last_rebuilt_at: Option<DateTime<Utc>>,
    pub invalidation_count: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuietHoursSnapshot {
    pub enabled: bool,
    pub start_minute_of_day: Option<u16>,
    pub end_minute_of_day: Option<u16>,
    pub summary: String,
    pub state_label: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PauseAllSnapshot {
    pub is_paused: bool,
    pub pause_until: Option<DateTime<Utc>>,
    pub summary: String,
    pub available_presets: Vec<PauseAllPreset>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeSummarySnapshot {
    pub tone: &'static str,
    pub title: String,
    pub detail: String,
}

#[tauri::command]
pub fn get_scheduler_snapshot(
    app: tauri::AppHandle,
    runtime: tauri::State<SchedulerRuntime>,
) -> Result<SchedulerSnapshot, String> {
    let runtime_snapshot = ensure_runtime_snapshot(&app, &runtime)?;
    let scheduler_state = SchedulerStateRepository::for_app(&app)?.get()?;

    Ok(build_scheduler_snapshot(
        &scheduler_state,
        &runtime_snapshot,
        Utc::now(),
    ))
}

#[tauri::command]
pub fn save_quiet_hours(
    app: tauri::AppHandle,
    runtime: tauri::State<SchedulerRuntime>,
    quiet_hours: Option<LocalTimeWindow>,
) -> Result<SchedulerSnapshot, String> {
    if let Some(window) = quiet_hours.as_ref() {
        window.validate()?;
    }

    let repository = SchedulerStateRepository::for_app(&app)?;
    let mut state = repository.get()?;
    state.quiet_hours = quiet_hours;
    state.updated_at = Utc::now();
    repository.save(&state)?;

    let runtime_snapshot = runtime.invalidate_for_app(&app)?;
    let saved_state = repository.get()?;

    Ok(build_scheduler_snapshot(
        &saved_state,
        &runtime_snapshot,
        Utc::now(),
    ))
}

#[tauri::command]
pub fn pause_all_reminders(
    app: tauri::AppHandle,
    runtime: tauri::State<SchedulerRuntime>,
    preset: PauseAllPreset,
) -> Result<SchedulerSnapshot, String> {
    let repository = SchedulerStateRepository::for_app(&app)?;
    let mut state = repository.get()?;
    state.pause_until = Some(resolve_pause_until(preset, Utc::now())?);
    state.updated_at = Utc::now();
    repository.save(&state)?;

    let runtime_snapshot = runtime.invalidate_for_app(&app)?;
    let saved_state = repository.get()?;

    Ok(build_scheduler_snapshot(
        &saved_state,
        &runtime_snapshot,
        Utc::now(),
    ))
}

#[tauri::command]
pub fn resume_all_reminders(
    app: tauri::AppHandle,
    runtime: tauri::State<SchedulerRuntime>,
) -> Result<SchedulerSnapshot, String> {
    let repository = SchedulerStateRepository::for_app(&app)?;
    let mut state = repository.get()?;
    state.pause_until = None;
    state.updated_at = Utc::now();
    repository.save(&state)?;

    let runtime_snapshot = runtime.invalidate_for_app(&app)?;
    let saved_state = repository.get()?;

    Ok(build_scheduler_snapshot(
        &saved_state,
        &runtime_snapshot,
        Utc::now(),
    ))
}

fn ensure_runtime_snapshot(
    app: &tauri::AppHandle,
    runtime: &SchedulerRuntime,
) -> Result<SchedulerRuntimeSnapshot, String> {
    let snapshot = runtime.snapshot()?;
    if snapshot.last_rebuilt_at.is_some() {
        return Ok(snapshot);
    }

    runtime.rebuild_for_app(app)
}

fn build_scheduler_snapshot(
    scheduler_state: &SchedulerState,
    runtime_snapshot: &SchedulerRuntimeSnapshot,
    now: DateTime<Utc>,
) -> SchedulerSnapshot {
    let quiet_active = scheduler_state
        .quiet_hours
        .as_ref()
        .is_some_and(|quiet_hours| quiet_hours.contains_utc(now));
    let pause_active = scheduler_state.pause_until.is_some_and(|pause_until| pause_until > now);
    let quiet_hours = build_quiet_hours_snapshot(scheduler_state, now);
    let pause_all = build_pause_all_snapshot(scheduler_state, now);

    let runtime_summary = if pause_active {
        RuntimeSummarySnapshot {
            tone: "paused",
            title: pause_all.summary.clone(),
            detail: "Resume now or let reminders recompute from the current rules when the pause ends.".to_string(),
        }
    } else if quiet_active {
        RuntimeSummarySnapshot {
            tone: "quiet",
            title: quiet_hours.state_label.clone(),
            detail: "Reminders wait for the next allowed moment instead of replaying in a burst.".to_string(),
        }
    } else {
        RuntimeSummarySnapshot {
            tone: "idle",
            title: "Allowed now".to_string(),
            detail: "Quiet hours and pause-all stay available here without leaving the dashboard.".to_string(),
        }
    };

    SchedulerSnapshot {
        quiet_hours,
        pause_all,
        runtime_summary,
        last_rebuilt_at: runtime_snapshot.last_rebuilt_at,
        invalidation_count: runtime_snapshot.invalidation_count,
    }
}

fn build_quiet_hours_snapshot(scheduler_state: &SchedulerState, now: DateTime<Utc>) -> QuietHoursSnapshot {
    match scheduler_state.quiet_hours.as_ref() {
        Some(quiet_hours) => QuietHoursSnapshot {
            enabled: true,
            start_minute_of_day: Some(quiet_hours.start_minute_of_day),
            end_minute_of_day: Some(quiet_hours.end_minute_of_day),
            summary: format_window(quiet_hours),
            state_label: if quiet_hours.contains_utc(now) {
                format!("Quiet until {}", format_minute(quiet_hours.end_minute_of_day))
            } else {
                "Allowed now".to_string()
            },
        },
        None => QuietHoursSnapshot {
            enabled: false,
            start_minute_of_day: None,
            end_minute_of_day: None,
            summary: "Off".to_string(),
            state_label: "Allowed now".to_string(),
        },
    }
}

fn build_pause_all_snapshot(scheduler_state: &SchedulerState, now: DateTime<Utc>) -> PauseAllSnapshot {
    let available_presets = vec![
        PauseAllPreset::ThirtyMinutes,
        PauseAllPreset::OneHour,
        PauseAllPreset::TwoHours,
        PauseAllPreset::RestOfToday,
    ];

    match scheduler_state.pause_until {
        Some(pause_until) if pause_until > now => PauseAllSnapshot {
            is_paused: true,
            pause_until: Some(pause_until),
            summary: format!("Paused until {}", format_utc_time(pause_until)),
            available_presets,
        },
        _ => PauseAllSnapshot {
            is_paused: false,
            pause_until: scheduler_state.pause_until,
            summary: "Pause reminders for a short stretch".to_string(),
            available_presets,
        },
    }
}

fn resolve_pause_until(preset: PauseAllPreset, now: DateTime<Utc>) -> Result<DateTime<Utc>, String> {
    match preset {
        PauseAllPreset::ThirtyMinutes => Ok(now + Duration::minutes(30)),
        PauseAllPreset::OneHour => Ok(now + Duration::hours(1)),
        PauseAllPreset::TwoHours => Ok(now + Duration::hours(2)),
        PauseAllPreset::RestOfToday => {
            let local_now = now.with_timezone(&Local);
            let next_date = local_now.date_naive() + Duration::days(1);
            Ok(build_local_candidate(next_date, 0, 0)?.with_timezone(&Utc))
        }
    }
}

fn format_window(window: &LocalTimeWindow) -> String {
    format!(
        "{}-{}",
        format_minute(window.start_minute_of_day),
        format_minute(window.end_minute_of_day)
    )
}

fn format_minute(value: u16) -> String {
    format!("{:02}:{:02}", value / 60, value % 60)
}

fn format_utc_time(value: DateTime<Utc>) -> String {
    let local = value.with_timezone(&Local);
    format!("{:02}:{:02}", local.hour(), local.minute())
}
