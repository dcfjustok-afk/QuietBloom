use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tauri::Emitter;

use crate::domain::scheduler::SchedulerState;
use crate::persistence::scheduler_state::SchedulerStateRepository;

use super::scheduler::{SchedulerRuntime, SchedulerRuntimeSnapshot};

pub const SCHEDULER_CHANGED_EVENT: &str = "scheduler:changed";

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum LifecycleRecoveryReason {
    Startup,
    Resume,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SchedulerInvalidation {
    pub reason: LifecycleRecoveryReason,
    pub invalidation_count: u64,
}

pub fn plan_lifecycle_recovery(
    scheduler_state: &SchedulerState,
    now: DateTime<Utc>,
) -> SchedulerState {
    let mut next_state = scheduler_state.clone();

    if next_state.pause_until.is_some_and(|pause_until| pause_until <= now) {
        next_state.pause_until = None;
    }

    next_state.last_reconciled_at = Some(now);
    next_state.updated_at = now;
    next_state
}

pub fn build_scheduler_invalidation(
    reason: LifecycleRecoveryReason,
    snapshot: &SchedulerRuntimeSnapshot,
) -> SchedulerInvalidation {
    SchedulerInvalidation {
        reason,
        invalidation_count: snapshot.invalidation_count,
    }
}

pub fn reconcile_scheduler_for_app(
    app: &tauri::AppHandle,
    runtime: &SchedulerRuntime,
    reason: LifecycleRecoveryReason,
) -> Result<SchedulerRuntimeSnapshot, String> {
    let repository = SchedulerStateRepository::for_app(app)?;
    let planned_state = plan_lifecycle_recovery(&repository.get()?, Utc::now());
    repository.save(&planned_state)?;

    let snapshot = runtime.invalidate_for_app(app)?;
    app.emit(
        SCHEDULER_CHANGED_EVENT,
        build_scheduler_invalidation(reason, &snapshot),
    )
    .map_err(|error| error.to_string())?;

    Ok(snapshot)
}

#[cfg(test)]
mod tests {
    use chrono::{Duration, Utc};

    use crate::domain::scheduler::SchedulerState;
    use crate::runtime::scheduler::SchedulerRuntimeSnapshot;

    use super::{
        build_scheduler_invalidation, plan_lifecycle_recovery, LifecycleRecoveryReason,
    };

    #[test]
    fn lifecycle_recovery_startup_updates_reconciled_state_before_runtime_settles() {
        let now = Utc::now();
        let planned = plan_lifecycle_recovery(
            &SchedulerState {
                quiet_hours: None,
                pause_until: Some(now - Duration::minutes(5)),
                last_reconciled_at: Some(now - Duration::minutes(45)),
                updated_at: now - Duration::minutes(45),
            },
            now,
        );

        assert_eq!(planned.last_reconciled_at, Some(now));
        assert_eq!(planned.pause_until, None);
        assert_eq!(planned.updated_at, now);
    }

    #[test]
    fn lifecycle_recovery_resume_reuses_the_same_reconciliation_path() {
        let now = Utc::now();
        let state = SchedulerState {
            quiet_hours: None,
            pause_until: Some(now + Duration::minutes(30)),
            last_reconciled_at: Some(now - Duration::minutes(20)),
            updated_at: now - Duration::minutes(20),
        };

        let startup = plan_lifecycle_recovery(&state, now);
        let resume = plan_lifecycle_recovery(&state, now);

        assert_eq!(startup, resume);
    }

    #[test]
    fn lifecycle_recovery_emits_lightweight_scheduler_invalidation() {
        let payload = build_scheduler_invalidation(
            LifecycleRecoveryReason::Resume,
            &SchedulerRuntimeSnapshot {
                due_queue: vec![],
                invalidation_count: 3,
                last_rebuilt_at: Some(Utc::now()),
            },
        );

        assert_eq!(payload.reason, LifecycleRecoveryReason::Resume);
        assert_eq!(payload.invalidation_count, 3);
    }
}