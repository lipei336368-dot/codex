use std::path::Path;
use std::path::PathBuf;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::app_state::AppState;
use crate::commands::result::AppResult;

pub fn write_text_file_for_path(path: String, content: String) -> AppResult<()> {
    match std::fs::write(path, content) {
        Ok(()) => AppResult::ok(()),
        Err(error) => AppResult::error("files.write_failed", error.to_string()),
    }
}

pub fn write_binary_file_for_path(path: String, bytes: Vec<u8>) -> AppResult<()> {
    match std::fs::write(path, bytes) {
        Ok(()) => AppResult::ok(()),
        Err(error) => AppResult::error("files.write_failed", error.to_string()),
    }
}

pub fn reveal_path_in_file_manager_for_path(path: String) -> AppResult<()> {
    let target = PathBuf::from(path);
    if !target.exists() {
        return AppResult::error(
            "files.reveal_missing",
            format!("path does not exist: {}", target.to_string_lossy()),
        );
    }

    reveal_existing_path(&target)
}

pub fn save_question_asset_for_dir(
    data_dir: &Path,
    subject_id: String,
    file_name: String,
    bytes: Vec<u8>,
) -> AppResult<String> {
    let extension = image_extension(&file_name);
    let subject = sanitize_path_segment(&subject_id);
    let asset_dir = data_dir.join("assets").join(subject);
    if let Err(error) = std::fs::create_dir_all(&asset_dir) {
        return AppResult::error("files.asset_dir_failed", error.to_string());
    }

    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default();
    let path = asset_dir.join(format!("question-asset-{nonce}.{extension}"));

    match std::fs::write(&path, bytes) {
        Ok(()) => AppResult::ok(path.to_string_lossy().to_string()),
        Err(error) => AppResult::error("files.asset_write_failed", error.to_string()),
    }
}

pub fn save_question_asset_from_state(
    state: &AppState,
    subject_id: String,
    file_name: String,
    bytes: Vec<u8>,
) -> AppResult<String> {
    save_question_asset_for_dir(&state.data_dir(), subject_id, file_name, bytes)
}

#[tauri::command]
pub fn write_text_file(path: String, content: String) -> AppResult<()> {
    write_text_file_for_path(path, content)
}

#[tauri::command]
pub fn write_binary_file(path: String, bytes: Vec<u8>) -> AppResult<()> {
    write_binary_file_for_path(path, bytes)
}

#[tauri::command]
pub fn reveal_path_in_file_manager(path: String) -> AppResult<()> {
    reveal_path_in_file_manager_for_path(path)
}

#[tauri::command]
pub fn save_question_asset(
    state: tauri::State<'_, AppState>,
    subject_id: String,
    file_name: String,
    bytes: Vec<u8>,
) -> AppResult<String> {
    save_question_asset_from_state(&state, subject_id, file_name, bytes)
}

fn image_extension(file_name: &str) -> &'static str {
    let lower = file_name.to_lowercase();
    match lower.rsplit('.').next() {
        Some("jpg") | Some("jpeg") => "jpg",
        Some("webp") => "webp",
        Some("gif") => "gif",
        Some("bmp") => "bmp",
        Some("png") => "png",
        _ => "png",
    }
}

fn sanitize_path_segment(value: &str) -> String {
    let sanitized = value
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || character == '_' || character == '-' {
                character
            } else {
                '_'
            }
        })
        .collect::<String>();
    if sanitized.is_empty() {
        "default".to_string()
    } else {
        sanitized
    }
}

#[cfg(target_os = "windows")]
fn reveal_existing_path(target: &Path) -> AppResult<()> {
    let argument = if target.is_file() {
        format!("/select,{}", target.to_string_lossy())
    } else {
        target.to_string_lossy().to_string()
    };

    match Command::new("explorer").arg(argument).spawn() {
        Ok(_) => AppResult::ok(()),
        Err(error) => AppResult::error("files.reveal_failed", error.to_string()),
    }
}

#[cfg(target_os = "macos")]
fn reveal_existing_path(target: &Path) -> AppResult<()> {
    match Command::new("open").arg("-R").arg(target).spawn() {
        Ok(_) => AppResult::ok(()),
        Err(error) => AppResult::error("files.reveal_failed", error.to_string()),
    }
}

#[cfg(all(unix, not(target_os = "macos")))]
fn reveal_existing_path(target: &Path) -> AppResult<()> {
    let folder = if target.is_file() {
        target.parent().unwrap_or(target)
    } else {
        target
    };

    match Command::new("xdg-open").arg(folder).spawn() {
        Ok(_) => AppResult::ok(()),
        Err(error) => AppResult::error("files.reveal_failed", error.to_string()),
    }
}
