use serde::Serialize;

use crate::commands::result::AppResult;
use crate::domain::subject::SUBJECTS;

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
pub struct SubjectResponse {
    pub id: String,
    pub name: String,
    pub theme_key: String,
}

pub fn list_subjects() -> AppResult<Vec<SubjectResponse>> {
    AppResult::ok(
        SUBJECTS
            .iter()
            .map(|subject| SubjectResponse {
                id: subject.id.to_string(),
                name: subject.name.to_string(),
                theme_key: subject.theme_key.to_string(),
            })
            .collect(),
    )
}

#[tauri::command]
pub fn subjects_list() -> AppResult<Vec<SubjectResponse>> {
    list_subjects()
}
