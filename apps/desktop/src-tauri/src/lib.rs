pub mod app_state;
pub mod commands;
pub mod domain;
pub mod export;
pub mod generation;
pub mod import;
pub mod migration;
pub mod storage;

use tauri::Manager;

#[tauri::command]
fn health_check() -> &'static str {
    "ok"
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .map_err(|error| format!("failed to resolve app data dir: {error}"))?;
            let config_dir = app
                .path()
                .app_config_dir()
                .map_err(|error| format!("failed to resolve app config dir: {error}"))?;
            let data_dir = app_state::resolve_data_dir(&config_dir, &data_dir);
            std::fs::create_dir_all(&data_dir)?;
            let database_path = data_dir.join(app_state::DATABASE_FILE_NAME);
            let state = app_state::AppState::open_with_config_dir(database_path, config_dir)?;
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            health_check,
            commands::app::app_data_directory,
            commands::app::app_backup_database,
            commands::app::app_set_data_directory,
            commands::app::app_window_minimize,
            commands::app::app_window_toggle_maximize,
            commands::app::app_window_close,
            commands::subjects::subjects_list,
            commands::chapters::chapters_list,
            commands::bank::bank_summary,
            commands::bank::bank_search,
            commands::bank::bank_search_paged,
            commands::bank::bank_create,
            commands::bank::bank_update,
            commands::bank::bank_delete,
            commands::bank::bank_reset_drawn,
            commands::bank::bank_mark_drawn,
            commands::bank::bank_generated_dates,
            commands::bank::bank_reset_generated_dates,
            commands::bank::bank_find_duplicates,
            commands::import_questions::import_json,
            commands::export_questions::export_json,
            commands::export_questions::export_json_by_ids,
            commands::export_questions::export_docx_by_ids_to_path,
            commands::files::write_text_file,
            commands::files::write_binary_file,
            commands::files::reveal_path_in_file_manager,
            commands::files::save_question_asset,
            commands::tasks::tasks_list
        ])
        .run(tauri::generate_context!())
        .expect("failed to run app");
}
