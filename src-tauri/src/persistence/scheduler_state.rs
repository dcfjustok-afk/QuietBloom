use std::fs;
use std::path::PathBuf;

use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use tauri::Manager;

use crate::domain::scheduler::SchedulerState;

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
        Ok(SchedulerState {
            quiet_hours: None,
            pause_until: None,
            last_reconciled_at: None,
            updated_at: Utc::now(),
        })
    }

    pub fn save(&self, state: &SchedulerState) -> Result<SchedulerState, String> {
        let _ = state;
        self.get()
    }

    fn initialize(&self) -> Result<(), String> {
        if let Some(parent) = self.db_path.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }

        let conn = self.open_connection()?;
        conn.execute_batch(CREATE_SCHEDULER_STATE_TABLE)
            .map_err(|error| error.to_string())?;
        Ok(())
    }

    fn open_connection(&self) -> Result<Connection, String> {
        Connection::open(&self.db_path).map_err(|error| error.to_string())
    }
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