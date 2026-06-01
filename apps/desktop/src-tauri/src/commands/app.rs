use std::path::PathBuf;

use crate::app_state::{write_data_dir_config, AppState, DATABASE_FILE_NAME};
use crate::commands::result::AppResult;

pub fn app_data_directory_for_state(state: &AppState) -> AppResult<String> {
    AppResult::ok(state.data_dir().to_string_lossy().to_string())
}

pub fn app_backup_database_for_state(state: &AppState, path: String) -> AppResult<()> {
    let target = PathBuf::from(path);
    if let Some(parent) = target.parent() {
        if let Err(error) = std::fs::create_dir_all(parent) {
            return AppResult::error("app.backup_dir_failed", error.to_string());
        }
    }

    match std::fs::copy(state.database_path(), &target) {
        Ok(_) => AppResult::ok(()),
        Err(error) => AppResult::error("app.backup_failed", error.to_string()),
    }
}

pub fn app_set_data_directory_for_state(state: &AppState, path: String) -> AppResult<String> {
    let target_dir = PathBuf::from(path);
    if let Err(error) = std::fs::create_dir_all(&target_dir) {
        return AppResult::error("app.data_dir_create_failed", error.to_string());
    }

    let current_dir = state.data_dir();
    if is_nested_directory(&target_dir, &current_dir) {
        return AppResult::error(
            "app.data_dir_nested",
            "new data directory cannot be inside the current data directory",
        );
    }

    let target_database = target_dir.join(DATABASE_FILE_NAME);
    if let Err(error) = std::fs::copy(state.database_path(), &target_database) {
        return AppResult::error("app.data_dir_database_copy_failed", error.to_string());
    }

    let current_assets = current_dir.join("assets");
    if current_assets.exists() {
        let target_assets = target_dir.join("assets");
        if let Err(error) = copy_directory_contents(&current_assets, &target_assets) {
            return AppResult::error("app.data_dir_assets_copy_failed", error.to_string());
        }
    }

    if let Err(error) = write_data_dir_config(&state.config_dir(), &target_dir) {
        return AppResult::error("app.data_dir_config_failed", error.to_string());
    }

    AppResult::ok(target_dir.to_string_lossy().to_string())
}

pub fn window_command_result(result: tauri::Result<()>, code: &str) -> AppResult<()> {
    match result {
        Ok(()) => AppResult::ok(()),
        Err(error) => AppResult::error(code, error.to_string()),
    }
}

#[tauri::command]
pub fn app_data_directory(state: tauri::State<'_, AppState>) -> AppResult<String> {
    app_data_directory_for_state(&state)
}

#[tauri::command]
pub fn app_backup_database(state: tauri::State<'_, AppState>, path: String) -> AppResult<()> {
    app_backup_database_for_state(&state, path)
}

#[tauri::command]
pub fn app_set_data_directory(state: tauri::State<'_, AppState>, path: String) -> AppResult<String> {
    app_set_data_directory_for_state(&state, path)
}

#[tauri::command]
pub fn app_window_minimize(window: tauri::Window) -> AppResult<()> {
    window_command_result(window.minimize(), "app.window_minimize_failed")
}

#[tauri::command]
pub fn app_window_toggle_maximize(window: tauri::Window) -> AppResult<()> {
    if matches!(window.is_maximized(), Ok(true)) {
        window_command_result(window.unmaximize(), "app.window_unmaximize_failed")
    } else {
        window_command_result(window.maximize(), "app.window_maximize_failed")
    }
}

#[tauri::command]
pub fn app_window_close(window: tauri::Window) -> AppResult<()> {
    window_command_result(window.close(), "app.window_close_failed")
}

fn is_nested_directory(target_dir: &PathBuf, current_dir: &PathBuf) -> bool {
    let Ok(target) = target_dir.canonicalize() else {
        return false;
    };
    let Ok(current) = current_dir.canonicalize() else {
        return false;
    };
    target != current && target.starts_with(current)
}

fn copy_directory_contents(source: &PathBuf, target: &PathBuf) -> std::io::Result<()> {
    std::fs::create_dir_all(target)?;
    for entry in std::fs::read_dir(source)? {
        let entry = entry?;
        let source_path = entry.path();
        let target_path = target.join(entry.file_name());
        if source_path.is_dir() {
            copy_directory_contents(&source_path, &target_path)?;
        } else {
            if let Some(parent) = target_path.parent() {
                std::fs::create_dir_all(parent)?;
            }
            std::fs::copy(&source_path, &target_path)?;
        }
    }
    Ok(())
}
