use serde::Serialize;

use crate::commands::result::AppResult;
use crate::domain::chapter::chapters_for_subject;

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
pub struct ChapterResponse {
    pub id: String,
    pub subject_id: String,
    pub order: i32,
    pub name: String,
    pub no_requirement: bool,
}

pub fn list_chapters(subject_id: String) -> AppResult<Vec<ChapterResponse>> {
    AppResult::ok(
        chapters_for_subject(&subject_id)
            .iter()
            .map(|chapter| ChapterResponse {
                id: chapter.id.to_string(),
                subject_id: chapter.subject_id.to_string(),
                order: chapter.order,
                name: chapter.name.to_string(),
                no_requirement: chapter.no_requirement,
            })
            .collect(),
    )
}

#[tauri::command]
pub fn chapters_list(subject_id: String) -> AppResult<Vec<ChapterResponse>> {
    list_chapters(subject_id)
}
