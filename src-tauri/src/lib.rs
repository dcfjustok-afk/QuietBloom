mod commands;
mod domain;
mod persistence;
mod runtime;

use chrono::Utc;
use persistence::scheduler_state::SchedulerStateRepository;
use tauri::Manager;
use runtime::lifecycle::{
    arm_pause_expiration_monitor, reconcile_scheduler_for_app, LifecycleRecoveryReason,
};
use runtime::scheduler::SchedulerRuntime;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(SchedulerRuntime::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            let runtime = app.state::<SchedulerRuntime>();
            reconcile_scheduler_for_app(&app.handle(), &runtime, LifecycleRecoveryReason::Startup)
                .map_err(std::io::Error::other)?;

            let scheduler_state = SchedulerStateRepository::for_app(&app.handle())
                .map_err(std::io::Error::other)?
                .get()
                .map_err(std::io::Error::other)?;

            if let Some(pause_until) = scheduler_state.pause_until.filter(|value| *value > Utc::now()) {
                arm_pause_expiration_monitor(app.handle().clone(), runtime.inner().clone(), pause_until);
            }

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
            commands::scheduler::reconcile_scheduler,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
