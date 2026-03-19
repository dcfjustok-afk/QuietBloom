use crate::domain::reminder::{Reminder, ReminderDraft};
use crate::persistence::reminders::ReminderRepository;

#[tauri::command]
pub fn list_reminders(app: tauri::AppHandle) -> Result<Vec<Reminder>, String> {
    ReminderRepository::for_app(&app)?.list()
}

#[tauri::command]
pub fn save_reminder(
    app: tauri::AppHandle,
    reminder: ReminderDraft,
) -> Result<Reminder, String> {
    ReminderRepository::for_app(&app)?.save(reminder)
}

#[tauri::command]
pub fn delete_reminder(app: tauri::AppHandle, id: i64) -> Result<(), String> {
    ReminderRepository::for_app(&app)?.delete(id)
}

#[tauri::command]
pub fn set_reminder_enabled(
    app: tauri::AppHandle,
    id: i64,
    enabled: bool,
) -> Result<Reminder, String> {
    ReminderRepository::for_app(&app)?.set_enabled(id, enabled)
}