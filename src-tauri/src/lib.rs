mod commands;
mod domain;
mod persistence;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::reminders::list_reminders,
            commands::reminders::save_reminder,
            commands::reminders::delete_reminder,
            commands::reminders::set_reminder_enabled,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
