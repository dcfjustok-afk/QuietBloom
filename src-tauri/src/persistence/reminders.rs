use std::cmp::Ordering;
use std::fs;
use std::path::PathBuf;

use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use tauri::Manager;

use crate::domain::reminder::{Reminder, ReminderDraft};
use crate::domain::schedule::Schedule;
use crate::domain::scheduler::{
    reconcile_effective_next_due, NextDueKind, ReminderRuntimeStatus, SchedulerContext,
    SchedulerState,
};

const CREATE_REMINDERS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    schedule_kind TEXT NOT NULL,
    schedule_json TEXT NOT NULL,
    next_due_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
)
"#;

const CREATE_REMINDERS_INDEX: &str = r#"
CREATE INDEX IF NOT EXISTS idx_reminders_enabled_next_due_at
ON reminders (enabled, next_due_at)
"#;

const ADD_BASE_DUE_AT_COLUMN: &str = r#"
ALTER TABLE reminders ADD COLUMN base_due_at TEXT
"#;

const ADD_RUNTIME_STATUS_COLUMN: &str = r#"
ALTER TABLE reminders ADD COLUMN runtime_status TEXT NOT NULL DEFAULT 'scheduled'
"#;

const ADD_NEXT_DUE_KIND_COLUMN: &str = r#"
ALTER TABLE reminders ADD COLUMN next_due_kind TEXT NOT NULL DEFAULT 'normal'
"#;

#[derive(Debug, Clone)]
pub struct ReminderRepository {
    db_path: PathBuf,
}

impl ReminderRepository {
    pub fn refresh_all(
        &self,
        scheduler_state: &SchedulerState,
        now: DateTime<Utc>,
    ) -> Result<Vec<Reminder>, String> {
        let conn = self.open_connection()?;
        let mut reminders = self.list_with_conn(&conn)?;

        for reminder in &mut reminders {
            let (next_due_at, base_due_at, next_due_kind, runtime_status) =
                compute_reconciled_runtime_fields(reminder, scheduler_state, now)?;
            self.persist_runtime_fields(
                &conn,
                reminder.id,
                next_due_at,
                base_due_at,
                &next_due_kind,
                &runtime_status,
                now,
            )?;
            reminder.next_due_at = next_due_at;
            reminder.base_due_at = base_due_at;
            reminder.next_due_kind = next_due_kind;
            reminder.runtime_status = runtime_status;
            reminder.updated_at = now;
        }

        reminders.sort_by(compare_reminders);
        Ok(reminders)
    }

    pub fn for_app(app: &tauri::AppHandle) -> Result<Self, String> {
        let mut data_dir = app
            .path()
            .app_data_dir()
            .map_err(|error| error.to_string())?;
        data_dir.push("quietbloom.db");
        Self::new(data_dir)
    }

    pub fn new<P: Into<PathBuf>>(db_path: P) -> Result<Self, String> {
        let repository = Self {
            db_path: db_path.into(),
        };
        repository.initialize()?;
        Ok(repository)
    }

    pub fn list(&self) -> Result<Vec<Reminder>, String> {
        let conn = self.open_connection()?;
        let mut reminders = self.list_with_conn(&conn)?;

        reminders.sort_by(compare_reminders);
        Ok(reminders)
    }

    pub fn save(&self, draft: ReminderDraft) -> Result<Reminder, String> {
        let draft = draft.normalized()?;
        let now = Utc::now();
        let schedule_json = serde_json::to_string(&draft.schedule).map_err(|error| error.to_string())?;
        let (next_due_at, base_due_at, next_due_kind, runtime_status) =
            compute_runtime_fields(draft.enabled(), &draft.schedule, now, &SchedulerContext::default())?;

        let mut conn = self.open_connection()?;
        let tx = conn.transaction().map_err(|error| error.to_string())?;

        let reminder_id = if let Some(id) = draft.id {
            let created_at = tx
                .query_row(
                    "SELECT created_at FROM reminders WHERE id = ?1",
                    [id],
                    |row| row.get::<_, String>(0),
                )
                .optional()
                .map_err(|error| error.to_string())?
                .ok_or_else(|| format!("reminder {} not found", id))?;

            tx.execute(
                "UPDATE reminders SET type = ?1, title = ?2, description = ?3, enabled = ?4, schedule_kind = ?5, schedule_json = ?6, next_due_at = ?7, base_due_at = ?8, next_due_kind = ?9, runtime_status = ?10, created_at = ?11, updated_at = ?12 WHERE id = ?13",
                params![
                    draft.reminder_type,
                    draft.title,
                    draft.description,
                    bool_to_int(draft.enabled()),
                    draft.schedule.kind(),
                    schedule_json,
                    next_due_at.map(|value| value.to_rfc3339()),
                    base_due_at.map(|value| value.to_rfc3339()),
                    next_due_kind.as_str(),
                    runtime_status.as_str(),
                    created_at,
                    now.to_rfc3339(),
                    id,
                ],
            )
            .map_err(|error| error.to_string())?;

            id
        } else {
            tx.execute(
                "INSERT INTO reminders (type, title, description, enabled, schedule_kind, schedule_json, next_due_at, base_due_at, next_due_kind, runtime_status, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                params![
                    draft.reminder_type,
                    draft.title,
                    draft.description,
                    bool_to_int(draft.enabled()),
                    draft.schedule.kind(),
                    schedule_json,
                    next_due_at.map(|value| value.to_rfc3339()),
                    base_due_at.map(|value| value.to_rfc3339()),
                    next_due_kind.as_str(),
                    runtime_status.as_str(),
                    now.to_rfc3339(),
                    now.to_rfc3339(),
                ],
            )
            .map_err(|error| error.to_string())?;

            tx.last_insert_rowid()
        };

        tx.commit().map_err(|error| error.to_string())?;
        self.get(reminder_id)
    }

    pub fn delete(&self, id: i64) -> Result<(), String> {
        let conn = self.open_connection()?;
        let affected = conn
            .execute("DELETE FROM reminders WHERE id = ?1", [id])
            .map_err(|error| error.to_string())?;

        if affected == 0 {
            return Err(format!("reminder {} not found", id));
        }

        Ok(())
    }

    pub fn set_enabled(&self, id: i64, enabled: bool) -> Result<Reminder, String> {
        let mut reminder = self.get(id)?;
        reminder.enabled = enabled;
        reminder.updated_at = Utc::now();

        let (next_due_at, base_due_at, next_due_kind, runtime_status) = compute_runtime_fields(
            enabled,
            &reminder.schedule,
            reminder.updated_at,
            &SchedulerContext::default(),
        )?;
        reminder.base_due_at = base_due_at;
        reminder.next_due_kind = next_due_kind;
        reminder.runtime_status = runtime_status.clone();
        reminder.next_due_at = next_due_at;

        let conn = self.open_connection()?;
        let affected = conn
            .execute(
                "UPDATE reminders SET enabled = ?1, next_due_at = ?2, base_due_at = ?3, next_due_kind = ?4, runtime_status = ?5, updated_at = ?6 WHERE id = ?7",
                params![
                    bool_to_int(enabled),
                    reminder.next_due_at.map(|value| value.to_rfc3339()),
                    reminder.base_due_at.map(|value| value.to_rfc3339()),
                    reminder.next_due_kind.as_str(),
                    runtime_status.as_str(),
                    reminder.updated_at.to_rfc3339(),
                    id,
                ],
            )
            .map_err(|error| error.to_string())?;

        if affected == 0 {
            return Err(format!("reminder {} not found", id));
        }

        self.get(id)
    }

    fn initialize(&self) -> Result<(), String> {
        if let Some(parent) = self.db_path.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }

        let conn = self.open_connection()?;
        conn.execute_batch(CREATE_REMINDERS_TABLE)
            .map_err(|error| error.to_string())?;
        conn.execute_batch(CREATE_REMINDERS_INDEX)
            .map_err(|error| error.to_string())?;
        ensure_column(&conn, "reminders", "base_due_at", ADD_BASE_DUE_AT_COLUMN)?;
        ensure_column(&conn, "reminders", "runtime_status", ADD_RUNTIME_STATUS_COLUMN)?;
        ensure_column(&conn, "reminders", "next_due_kind", ADD_NEXT_DUE_KIND_COLUMN)?;
        conn.execute(
            "UPDATE reminders SET base_due_at = COALESCE(base_due_at, next_due_at), next_due_kind = COALESCE(NULLIF(next_due_kind, ''), 'normal'), runtime_status = COALESCE(NULLIF(runtime_status, ''), 'scheduled')",
            [],
        )
        .map_err(|error| error.to_string())?;
        Ok(())
    }

    fn open_connection(&self) -> Result<Connection, String> {
        Connection::open(&self.db_path).map_err(|error| error.to_string())
    }

    fn get(&self, id: i64) -> Result<Reminder, String> {
        let conn = self.open_connection()?;
        self.get_with_conn(&conn, id)
    }

    fn get_with_conn(&self, conn: &Connection, id: i64) -> Result<Reminder, String> {
        conn.query_row(
            "SELECT id, type, title, description, enabled, schedule_kind, schedule_json, next_due_at, base_due_at, next_due_kind, runtime_status, created_at, updated_at FROM reminders WHERE id = ?1",
            [id],
            |row| self.map_row(row),
        )
        .map_err(|error| error.to_string())
    }

    fn list_with_conn(&self, conn: &Connection) -> Result<Vec<Reminder>, String> {
        let mut statement = conn
            .prepare(
                "SELECT id, type, title, description, enabled, schedule_kind, schedule_json, next_due_at, base_due_at, next_due_kind, runtime_status, created_at, updated_at FROM reminders",
            )
            .map_err(|error| error.to_string())?;
        let rows = statement
            .query_map([], |row| self.map_row(row))
            .map_err(|error| error.to_string())?;

        rows.map(|row| row.map_err(|error| error.to_string()))
            .collect::<Result<Vec<_>, _>>()
    }

    fn persist_runtime_fields(
        &self,
        conn: &Connection,
        reminder_id: i64,
        next_due_at: Option<DateTime<Utc>>,
        base_due_at: Option<DateTime<Utc>>,
        next_due_kind: &NextDueKind,
        runtime_status: &ReminderRuntimeStatus,
        now: DateTime<Utc>,
    ) -> Result<(), String> {
        conn.execute(
            "UPDATE reminders SET next_due_at = ?1, base_due_at = ?2, next_due_kind = ?3, runtime_status = ?4, updated_at = ?5 WHERE id = ?6",
            params![
                next_due_at.map(|value| value.to_rfc3339()),
                base_due_at.map(|value| value.to_rfc3339()),
                next_due_kind.as_str(),
                runtime_status.as_str(),
                now.to_rfc3339(),
                reminder_id,
            ],
        )
        .map_err(|error| error.to_string())?;

        Ok(())
    }

    fn map_row(&self, row: &rusqlite::Row<'_>) -> rusqlite::Result<Reminder> {
        let schedule_json: String = row.get(6)?;
        let next_due_at: Option<String> = row.get(7)?;
        let base_due_at: Option<String> = row.get(8)?;
        let next_due_kind: String = row.get(9)?;
        let runtime_status: String = row.get(10)?;
        let created_at: String = row.get(11)?;
        let updated_at: String = row.get(12)?;
        let parsed_next_due_at = next_due_at
            .as_ref()
            .map(|value| parse_datetime(value))
            .transpose()
            .map_err(json_error)?;
        let parsed_base_due_at = base_due_at
            .as_ref()
            .map(|value| parse_datetime(value))
            .transpose()
            .map_err(json_error)?;

        Ok(Reminder {
            id: row.get(0)?,
            reminder_type: row.get(1)?,
            title: row.get(2)?,
            description: row.get(3)?,
            enabled: row.get::<_, i64>(4)? != 0,
            schedule: serde_json::from_str(&schedule_json).map_err(json_error)?,
            next_due_at: parsed_next_due_at,
            base_due_at: parsed_base_due_at,
            next_due_kind: NextDueKind::from_str(&next_due_kind).map_err(json_error)?,
            runtime_status: ReminderRuntimeStatus::from_str(&runtime_status).map_err(json_error)?,
            created_at: parse_datetime(&created_at).map_err(json_error)?,
            updated_at: parse_datetime(&updated_at).map_err(json_error)?,
        })
    }
}

fn parse_datetime(value: &str) -> Result<DateTime<Utc>, chrono::ParseError> {
    DateTime::parse_from_rfc3339(value).map(|date| date.with_timezone(&Utc))
}

fn json_error<E>(error: E) -> rusqlite::Error
where
    E: std::error::Error + Send + Sync + 'static,
{
    rusqlite::Error::FromSqlConversionFailure(
        0,
        rusqlite::types::Type::Text,
        Box::new(error),
    )
}

fn bool_to_int(value: bool) -> i64 {
    if value { 1 } else { 0 }
}

fn compute_runtime_fields(
    enabled: bool,
    schedule: &Schedule,
    now: DateTime<Utc>,
    context: &SchedulerContext,
) -> Result<(
    Option<DateTime<Utc>>,
    Option<DateTime<Utc>>,
    NextDueKind,
    ReminderRuntimeStatus,
), String> {
    if !enabled {
        return Ok((
            None,
            None,
            NextDueKind::Normal,
            ReminderRuntimeStatus::Scheduled,
        ));
    }

    let decision = schedule.compute_effective_next_due(now, context)?;
    Ok((
        Some(decision.effective_due_at),
        Some(decision.base_due_at),
        decision.next_due_kind,
        decision.runtime_status,
    ))
}

fn compute_reconciled_runtime_fields(
    reminder: &Reminder,
    scheduler_state: &SchedulerState,
    now: DateTime<Utc>,
) -> Result<(
    Option<DateTime<Utc>>,
    Option<DateTime<Utc>>,
    NextDueKind,
    ReminderRuntimeStatus,
), String> {
    let Some(decision) = reconcile_effective_next_due(
        &reminder.schedule,
        reminder.enabled,
        reminder.next_due_at,
        scheduler_state,
        now,
    )? else {
        return Ok((
            None,
            None,
            NextDueKind::Normal,
            ReminderRuntimeStatus::Scheduled,
        ));
    };

    Ok((
        Some(decision.effective_due_at),
        Some(decision.base_due_at),
        decision.next_due_kind,
        decision.runtime_status,
    ))
}

fn ensure_column(
    conn: &Connection,
    table_name: &str,
    column_name: &str,
    alter_statement: &str,
) -> Result<(), String> {
    let mut statement = conn
        .prepare(&format!("PRAGMA table_info({table_name})"))
        .map_err(|error| error.to_string())?;
    let columns = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|error| error.to_string())?;

    for column in columns {
        if column.map_err(|error| error.to_string())? == column_name {
            return Ok(());
        }
    }

    conn.execute_batch(alter_statement)
        .map_err(|error| error.to_string())
}

fn compare_reminders(left: &Reminder, right: &Reminder) -> Ordering {
    (!left.enabled)
        .cmp(&!right.enabled)
        .then_with(|| left.next_due_at.is_none().cmp(&right.next_due_at.is_none()))
        .then_with(|| left.next_due_at.cmp(&right.next_due_at))
        .then_with(|| left.id.cmp(&right.id))
}

#[cfg(test)]
mod tests {
    use super::ReminderRepository;
    use chrono::Utc;
    use rusqlite::Connection;
    use crate::domain::reminder::ReminderDraft;
    use crate::domain::schedule::{IntervalSchedule, Schedule};
    use std::env;
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn persists_and_reloads() {
        let path = temp_db_path("persists_and_reloads");
        let created = {
            let repository = ReminderRepository::new(path.clone()).unwrap();
            repository.save(sample_reminder(None)).unwrap()
        };

        let repository = ReminderRepository::new(path.clone()).unwrap();
        let reminders = repository.list().unwrap();

        assert_eq!(reminders.len(), 1);
        assert_eq!(reminders[0].id, created.id);
        assert_eq!(reminders[0].title, created.title);
        assert_eq!(reminders[0].next_due_at, created.next_due_at);

        let _ = fs::remove_file(path);
    }

    #[test]
    fn reminder_repository_crud_and_toggle() {
        let path = temp_db_path("reminder_repository_crud_and_toggle");
        let repository = ReminderRepository::new(path.clone()).unwrap();

        let created = repository.save(sample_reminder(None)).unwrap();
        assert!(created.next_due_at.is_some());

        let updated = repository
            .save(ReminderDraft {
                id: Some(created.id),
                title: "Stand and breathe".to_string(),
                ..sample_reminder(Some(created.id))
            })
            .unwrap();
        assert_eq!(updated.title, "Stand and breathe");

        let disabled = repository.set_enabled(created.id, false).unwrap();
        assert!(!disabled.enabled);
        assert!(disabled.next_due_at.is_none());

        let reminders = repository.list().unwrap();
        assert_eq!(reminders.len(), 1);
        assert_eq!(reminders[0].id, created.id);
        assert!(!reminders[0].enabled);

        repository.delete(created.id).unwrap();
        assert!(repository.list().unwrap().is_empty());

        let _ = fs::remove_file(path);
    }

    #[test]
    fn scheduler_state_repository_requires_explicit_refresh_instead_of_list_side_effects() {
        let path = temp_db_path("scheduler_state_repository_requires_explicit_refresh");
        let repository = ReminderRepository::new(path.clone()).unwrap();
        let created = repository.save(sample_reminder(None)).unwrap();

        let conn = Connection::open(&path).unwrap();
        conn.execute(
            "UPDATE reminders SET next_due_at = NULL, updated_at = ?1 WHERE id = ?2",
            rusqlite::params![Utc::now().to_rfc3339(), created.id],
        )
        .unwrap();

        let listed = repository.list().unwrap();
        assert!(listed[0].next_due_at.is_none());

        let scheduler_state = crate::domain::scheduler::SchedulerState {
            quiet_hours: None,
            pause_until: None,
            last_reconciled_at: Some(Utc::now()),
            updated_at: Utc::now(),
        };
        let refreshed = repository
            .refresh_all(&scheduler_state, Utc::now())
            .unwrap();
        assert!(refreshed[0].next_due_at.is_some());

        let _ = fs::remove_file(path);
    }

    #[test]
    fn reconcile_gap_refresh_all_persists_catch_up_metadata() {
        let path = temp_db_path("reconcile_gap_refresh_all_persists_catch_up_metadata");
        let repository = ReminderRepository::new(path.clone()).unwrap();
        let now = Utc::now();
        let created = repository.save(sample_reminder(None)).unwrap();

        let conn = Connection::open(&path).unwrap();
        conn.execute(
            "UPDATE reminders SET next_due_at = ?1, base_due_at = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![(now - chrono::Duration::minutes(15)).to_rfc3339(), now.to_rfc3339(), created.id],
        )
        .unwrap();

        let scheduler_state = crate::domain::scheduler::SchedulerState {
            quiet_hours: None,
            pause_until: None,
            last_reconciled_at: Some(now - chrono::Duration::minutes(30)),
            updated_at: now,
        };

        let refreshed = repository.refresh_all(&scheduler_state, now).unwrap();

        assert_eq!(refreshed[0].next_due_kind.as_str(), "catch_up");

        let _ = fs::remove_file(path);
    }

    fn sample_reminder(id: Option<i64>) -> ReminderDraft {
        ReminderDraft {
            id,
            reminder_type: "standing".to_string(),
            title: "Stand up".to_string(),
            description: Some("Shake out your shoulders".to_string()),
            enabled: Some(true),
            schedule: Schedule::Interval(IntervalSchedule {
                every_minutes: 120,
                anchor_minute_of_day: 0,
                active_window: None,
            }),
        }
    }

    fn temp_db_path(name: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        env::temp_dir().join(format!("quietbloom-{name}-{unique}.db"))
    }
}