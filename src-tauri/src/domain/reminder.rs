use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::domain::schedule::Schedule;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Reminder {
    pub id: i64,
    #[serde(rename = "type")]
    pub reminder_type: String,
    pub title: String,
    pub description: Option<String>,
    pub enabled: bool,
    pub schedule: Schedule,
    pub next_due_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ReminderDraft {
    pub id: Option<i64>,
    #[serde(rename = "type")]
    pub reminder_type: String,
    pub title: String,
    pub description: Option<String>,
    pub enabled: Option<bool>,
    pub schedule: Schedule,
}

impl ReminderDraft {
    pub fn normalized(mut self) -> Result<Self, String> {
        self.reminder_type = self.reminder_type.trim().to_owned();
        if self.reminder_type.is_empty() {
            return Err("reminder type is required".to_string());
        }

        self.title = self.title.trim().to_owned();
        if self.title.is_empty() {
            return Err("title is required".to_string());
        }

        self.description = self
            .description
            .take()
            .map(|value| value.trim().to_owned())
            .filter(|value| !value.is_empty());

        self.schedule.validate()?;

        Ok(self)
    }

    pub fn enabled(&self) -> bool {
        self.enabled.unwrap_or(true)
    }
}