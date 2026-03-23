mod commands;
mod domain;
mod persistence;
mod runtime;

use tauri::Manager;
use runtime::scheduler::SchedulerRuntime;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(SchedulerRuntime::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            let runtime = app.state::<SchedulerRuntime>();
            runtime
                .rebuild_for_app(&app.handle())
                .map_err(std::io::Error::other)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::reminders::list_reminders,
            commands::reminders::save_reminder,
            commands::reminders::delete_reminder,
            commands::reminders::set_reminder_enabled,
            commands::scheduler::get_scheduler_snapshot,
            commands::scheduler::save_quiet_hours,
            commands::scheduler::pause_all_reminders,
            commands::scheduler::resume_all_reminders,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
