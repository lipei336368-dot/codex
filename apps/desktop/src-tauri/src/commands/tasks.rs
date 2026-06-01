use crate::commands::result::AppResult;
use crate::domain::task::TaskProgress;

pub fn tasks_list_for_state() -> AppResult<Vec<TaskProgress>> {
    AppResult::ok(Vec::new())
}

#[tauri::command]
pub fn tasks_list() -> AppResult<Vec<TaskProgress>> {
    tasks_list_for_state()
}
