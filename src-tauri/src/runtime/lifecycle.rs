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