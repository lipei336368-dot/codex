use crate::app_state::AppState;
use crate::commands::result::AppResult;
use crate::import::{validate_standard_json, ImportReport};
use crate::storage::database::Database;

pub fn import_json_for_database(
    database: &Database,
    subject_id: String,
    json_text: String,
) -> AppResult<ImportReport> {
    let (questions, mut report) = validate_standard_json(&subject_id, &json_text);

    for question in questions {
        match database.create_question(question) {
            Ok(_) => report.added += 1,
            Err(error) => {
                report.skipped += 1;
                report.errors.push(crate::import::ImportError {
                    index: report.added + report.skipped,
                    stem: None,
                    message: error.to_string(),
                });
            }
        }
    }

    report.errors_count = report.errors.len();
    AppResult::ok(report)
}

pub fn import_json_from_state(
    state: &AppState,
    subject_id: String,
    json_text: String,
) -> AppResult<ImportReport> {
    match state
        .with_database(|database| Ok(import_json_for_database(database, subject_id, json_text)))
    {
        Ok(result) => result,
        Err(error) => AppResult::error("import.json_failed", error.to_string()),
    }
}

#[tauri::command]
pub fn import_json(
    state: tauri::State<'_, AppState>,
    subject_id: String,
    json_text: String,
) -> AppResult<ImportReport> {
    import_json_from_state(&state, subject_id, json_text)
}
