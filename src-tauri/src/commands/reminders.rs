use crate::domain::reminder::{Reminder, ReminderDraft};
use crate::persistence::reminders::ReminderRepository;
use crate::runtime::scheduler::SchedulerRuntime;

#[tauri::command]
pub fn list_reminders(app: tauri::AppHandle) -> Result<Vec<Reminder>, String> {
    ReminderRepository::for_app(&app)?.list()
}

#[tauri::command]
pub fn save_reminder(
    app: tauri::AppHandle,
    runtime: tauri::State<SchedulerRuntime>,
    reminder: ReminderDraft,
) -> Result<Reminder, String> {
    let saved = ReminderRepository::for_app(&app)?.save(reminder)?;
    runtime.invalidate_for_app(&app)?;
    Ok(saved)
}

#[tauri::command]
pub fn delete_reminder(
    app: tauri::AppHandle,
    runtime: tauri::State<SchedulerRuntime>,
    id: i64,
) -> Result<(), String> {
    ReminderRepository::for_app(&app)?.delete(id)?;
    runtime.invalidate_for_app(&app)?;
    Ok(())
}

#[tauri::command]
pub fn set_reminder_enabled(
    app: tauri::AppHandle,
    runtime: tauri::State<SchedulerRuntime>,
    id: i64,
    enabled: bool,
) -> Result<Reminder, String> {
    let reminder = ReminderRepository::for_app(&app)?.set_enabled(id, enabled)?;
    runtime.invalidate_for_app(&app)?;
    Ok(reminder)
}