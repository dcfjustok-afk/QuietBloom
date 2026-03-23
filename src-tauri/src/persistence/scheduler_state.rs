use std::fs;
use std::path::PathBuf;

use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use tauri::Manager;

use crate::domain::scheduler::{LocalTimeWindow, SchedulerState};

const CREATE_SCHEDULER_STATE_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS scheduler_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    quiet_hours_start_minute INTEGER,
    quiet_hours_end_minute INTEGER,
    pause_until_utc TEXT,
    last_reconciled_at_utc TEXT,
    updated_at_utc TEXT NOT NULL
)
"#;

#[derive(Debug, Clone)]
pub struct SchedulerStateRepository {
    db_path: PathBuf,
}

impl SchedulerStateRepository {
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

    pub fn get(&self) -> Result<SchedulerState, String> {
        let conn = self.open_connection()?;
        conn.query_row(
            "SELECT quiet_hours_start_minute, quiet_hours_end_minute, pause_until_utc, last_reconciled_at_utc, updated_at_utc FROM scheduler_state WHERE id = 1",
            [],
            |row| {
                let quiet_hours_start: Option<u16> = row.get(0)?;
                let quiet_hours_end: Option<u16> = row.get(1)?;
                let pause_until: Option<String> = row.get(2)?;
                let last_reconciled_at: Option<String> = row.get(3)?;
                let updated_at: String = row.get(4)?;

                let quiet_hours = match (quiet_hours_start, quiet_hours_end) {
                    (Some(start_minute_of_day), Some(end_minute_of_day)) => Some(LocalTimeWindow {
                        start_minute_of_day,
                        end_minute_of_day,
                    }),
                    (None, None) => None,
                    _ => {
                        return Err(rusqlite::Error::FromSqlConversionFailure(
                            0,
                            rusqlite::types::Type::Integer,
                            Box::new(std::io::Error::new(
                                std::io::ErrorKind::InvalidData,
                                "scheduler_state quiet hours are partially populated",
                            )),
                        ));
                    }
                };

                Ok(SchedulerState {
                    quiet_hours,
                    pause_until: pause_until
                        .as_deref()
                        .map(parse_datetime)
                        .transpose()
                        .map_err(json_error)?,
                    last_reconciled_at: last_reconciled_at
                        .as_deref()
                        .map(parse_datetime)
                        .transpose()
                        .map_err(json_error)?,
                    updated_at: parse_datetime(&updated_at).map_err(json_error)?,
                })
            },
        )
        .optional()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "scheduler_state row missing".to_string())
    }

    #[allow(dead_code)]
    pub fn save(&self, state: &SchedulerState) -> Result<SchedulerState, String> {
        let conn = self.open_connection()?;
        conn.execute(
            "INSERT INTO scheduler_state (id, quiet_hours_start_minute, quiet_hours_end_minute, pause_until_utc, last_reconciled_at_utc, updated_at_utc) VALUES (1, ?1, ?2, ?3, ?4, ?5) ON CONFLICT(id) DO UPDATE SET quiet_hours_start_minute = excluded.quiet_hours_start_minute, quiet_hours_end_minute = excluded.quiet_hours_end_minute, pause_until_utc = excluded.pause_until_utc, last_reconciled_at_utc = excluded.last_reconciled_at_utc, updated_at_utc = excluded.updated_at_utc",
            params![
                state.quiet_hours.as_ref().map(|value| i64::from(value.start_minute_of_day)),
                state.quiet_hours.as_ref().map(|value| i64::from(value.end_minute_of_day)),
                state.pause_until.map(|value| value.to_rfc3339()),
                state.last_reconciled_at.map(|value| value.to_rfc3339()),
                state.updated_at.to_rfc3339(),
            ],
        )
        .map_err(|error| error.to_string())?;

        self.get()
    }

    fn initialize(&self) -> Result<(), String> {
        if let Some(parent) = self.db_path.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }

        let conn = self.open_connection()?;
        conn.execute_batch(CREATE_SCHEDULER_STATE_TABLE)
            .map_err(|error| error.to_string())?;
        conn.execute(
            "INSERT INTO scheduler_state (id, updated_at_utc) SELECT 1, ?1 WHERE NOT EXISTS (SELECT 1 FROM scheduler_state WHERE id = 1)",
            [Utc::now().to_rfc3339()],
        )
        .map_err(|error| error.to_string())?;
        Ok(())
    }

    fn open_connection(&self) -> Result<Connection, String> {
        Connection::open(&self.db_path).map_err(|error| error.to_string())
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

#[cfg(test)]
mod tests {
    use std::env;
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    use chrono::{Duration, Utc};

    use crate::domain::scheduler::{LocalTimeWindow, SchedulerState};

    use super::SchedulerStateRepository;

    #[test]
    fn scheduler_state_repository_persists_singleton_state() {
        let path = temp_db_path("scheduler_state_persists_singleton_state");
        let repository = SchedulerStateRepository::new(path.clone()).unwrap();
        let expected = SchedulerState {
            quiet_hours: Some(LocalTimeWindow {
                start_minute_of_day: 1320,
                end_minute_of_day: 480,
            }),
            pause_until: Some(Utc::now() + Duration::minutes(30)),
            last_reconciled_at: Some(Utc::now() - Duration::minutes(5)),
            updated_at: Utc::now(),
        };

        repository.save(&expected).unwrap();
        let loaded = repository.get().unwrap();

        assert_eq!(loaded.quiet_hours, expected.quiet_hours);
        assert_eq!(loaded.pause_until, expected.pause_until);
        assert_eq!(loaded.last_reconciled_at, expected.last_reconciled_at);

        let _ = fs::remove_file(path);
    }

    fn temp_db_path(name: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        env::temp_dir().join(format!("quietbloom-{name}-{unique}.db"))
    }
}