use std::collections::BTreeMap;

use serde::Serialize;

use crate::app_state::AppState;
use crate::commands::result::AppResult;
use crate::domain::question::{
    NewQuestion, PagedQuestionResult, PagedQuestionSearch, Question, QuestionSearch, QuestionType,
    UpdateQuestion,
};
use crate::storage::database::Database;

#[derive(Clone, Debug, Default, Serialize, PartialEq, Eq)]
pub struct QuestionTypeCounts {
    pub single_choice: usize,
    pub multiple_choice: usize,
    pub short_answer: usize,
    pub essay: usize,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
pub struct BankSummary {
    pub total: usize,
    pub available: usize,
    pub by_type: QuestionTypeCounts,
    pub available_by_type: QuestionTypeCounts,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
pub struct DuplicateQuestion {
    pub id: String,
    pub stem: String,
    pub chapter_id: String,
    pub question_type: QuestionType,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
pub struct DuplicateQuestionGroup {
    pub key: String,
    pub questions: Vec<DuplicateQuestion>,
}

pub fn bank_summary_for_database(
    database: &Database,
    subject_id: String,
) -> AppResult<BankSummary> {
    let rows = match database.question_type_counts(&subject_id) {
        Ok(rows) => rows,
        Err(error) => return AppResult::error("bank.summary_failed", error.to_string()),
    };

    let mut summary = BankSummary {
        total: 0,
        available: 0,
        by_type: QuestionTypeCounts::default(),
        available_by_type: QuestionTypeCounts::default(),
    };

    for (question_type, total, available) in rows {
        let total = total.max(0) as usize;
        let available = available.max(0) as usize;
        summary.total += total;
        summary.available += available;
        add_question_type_count(&mut summary.by_type, &question_type, total);
        add_question_type_count(&mut summary.available_by_type, &question_type, available);
    }

    AppResult::ok(summary)
}

pub fn bank_search_for_database(
    database: &Database,
    search: QuestionSearch,
) -> AppResult<Vec<Question>> {
    match database.search_questions(search) {
        Ok(questions) => AppResult::ok(questions),
        Err(error) => AppResult::error("bank.search_failed", error.to_string()),
    }
}

pub fn bank_search_paged_for_database(
    database: &Database,
    search: PagedQuestionSearch,
) -> AppResult<PagedQuestionResult> {
    match database.search_questions_paged(search) {
        Ok(result) => AppResult::ok(result),
        Err(error) => AppResult::error("bank.search_failed", error.to_string()),
    }
}

pub fn bank_create_for_database(database: &Database, question: NewQuestion) -> AppResult<String> {
    match database.create_question(question) {
        Ok(question_id) => AppResult::ok(question_id),
        Err(error) => AppResult::error("bank.create_failed", error.to_string()),
    }
}

pub fn bank_update_for_database(database: &Database, question: UpdateQuestion) -> AppResult<()> {
    match database.update_question(question) {
        Ok(()) => AppResult::ok(()),
        Err(error) => AppResult::error("bank.update_failed", error.to_string()),
    }
}

pub fn bank_delete_for_database(database: &Database, question_ids: Vec<String>) -> AppResult<()> {
    match database.delete_questions(&question_ids) {
        Ok(()) => AppResult::ok(()),
        Err(error) => AppResult::error("bank.delete_failed", error.to_string()),
    }
}

pub fn bank_reset_drawn_for_database(
    database: &Database,
    subject_id: String,
    question_ids: Vec<String>,
) -> AppResult<()> {
    match database.reset_drawn(&subject_id, &question_ids) {
        Ok(()) => AppResult::ok(()),
        Err(error) => AppResult::error("bank.reset_drawn_failed", error.to_string()),
    }
}

pub fn bank_mark_drawn_for_database(
    database: &Database,
    subject_id: String,
    question_ids: Vec<String>,
    publish_date: String,
) -> AppResult<()> {
    for question_id in question_ids {
        if let Err(error) = database.mark_drawn(&subject_id, &question_id, &publish_date, None) {
            return AppResult::error("bank.mark_drawn_failed", error.to_string());
        }
    }

    AppResult::ok(())
}

pub fn bank_generated_dates_for_database(
    database: &Database,
    subject_id: String,
) -> AppResult<Vec<String>> {
    match database.generated_dates(&subject_id) {
        Ok(dates) => AppResult::ok(dates),
        Err(error) => AppResult::error("bank.generated_dates_failed", error.to_string()),
    }
}

pub fn bank_find_duplicates_for_database(
    database: &Database,
    subject_id: String,
) -> AppResult<Vec<DuplicateQuestionGroup>> {
    let questions = match database.search_questions(QuestionSearch {
        subject_id,
        chapter_id: None,
        question_type: None,
        query: None,
        include_drawn: true,
    }) {
        Ok(questions) => questions,
        Err(error) => return AppResult::error("bank.find_duplicates_failed", error.to_string()),
    };

    let mut groups: BTreeMap<String, Vec<DuplicateQuestion>> = BTreeMap::new();
    for question in questions {
        let key = normalize_duplicate_key(&question.stem);
        if key.is_empty() {
            continue;
        }
        groups.entry(key).or_default().push(DuplicateQuestion {
            id: question.id,
            stem: question.stem,
            chapter_id: question.chapter_id,
            question_type: question.question_type,
        });
    }

    AppResult::ok(
        groups
            .into_iter()
            .filter(|(_, questions)| questions.len() > 1)
            .map(|(key, questions)| DuplicateQuestionGroup { key, questions })
            .collect(),
    )
}

pub fn bank_reset_generated_dates_for_database(
    database: &Database,
    subject_id: String,
    publish_dates: Vec<String>,
) -> AppResult<()> {
    match database.reset_generated_dates(&subject_id, &publish_dates) {
        Ok(()) => AppResult::ok(()),
        Err(error) => AppResult::error("bank.reset_generated_dates_failed", error.to_string()),
    }
}

pub fn bank_summary_from_state(state: &AppState, subject_id: String) -> AppResult<BankSummary> {
    match state.with_database(|database| Ok(bank_summary_for_database(database, subject_id))) {
        Ok(result) => result,
        Err(error) => AppResult::error("bank.summary_failed", error.to_string()),
    }
}

pub fn bank_search_from_state(
    state: &AppState,
    search: QuestionSearch,
) -> AppResult<Vec<Question>> {
    match state.with_database(|database| Ok(bank_search_for_database(database, search))) {
        Ok(result) => result,
        Err(error) => AppResult::error("bank.search_failed", error.to_string()),
    }
}

pub fn bank_search_paged_from_state(
    state: &AppState,
    search: PagedQuestionSearch,
) -> AppResult<PagedQuestionResult> {
    match state.with_database(|database| Ok(bank_search_paged_for_database(database, search))) {
        Ok(result) => result,
        Err(error) => AppResult::error("bank.search_failed", error.to_string()),
    }
}

pub fn bank_create_from_state(state: &AppState, question: NewQuestion) -> AppResult<String> {
    match state.with_database(|database| Ok(bank_create_for_database(database, question))) {
        Ok(result) => result,
        Err(error) => AppResult::error("bank.create_failed", error.to_string()),
    }
}

pub fn bank_update_from_state(state: &AppState, question: UpdateQuestion) -> AppResult<()> {
    match state.with_database(|database| Ok(bank_update_for_database(database, question))) {
        Ok(result) => result,
        Err(error) => AppResult::error("bank.update_failed", error.to_string()),
    }
}

pub fn bank_delete_from_state(state: &AppState, question_ids: Vec<String>) -> AppResult<()> {
    match state.with_database(|database| Ok(bank_delete_for_database(database, question_ids))) {
        Ok(result) => result,
        Err(error) => AppResult::error("bank.delete_failed", error.to_string()),
    }
}

pub fn bank_reset_drawn_from_state(
    state: &AppState,
    subject_id: String,
    question_ids: Vec<String>,
) -> AppResult<()> {
    match state.with_database(|database| {
        Ok(bank_reset_drawn_for_database(
            database,
            subject_id,
            question_ids,
        ))
    }) {
        Ok(result) => result,
        Err(error) => AppResult::error("bank.reset_drawn_failed", error.to_string()),
    }
}

pub fn bank_mark_drawn_from_state(
    state: &AppState,
    subject_id: String,
    question_ids: Vec<String>,
    publish_date: String,
) -> AppResult<()> {
    match state.with_database(|database| {
        Ok(bank_mark_drawn_for_database(
            database,
            subject_id,
            question_ids,
            publish_date,
        ))
    }) {
        Ok(result) => result,
        Err(error) => AppResult::error("bank.mark_drawn_failed", error.to_string()),
    }
}

pub fn bank_generated_dates_from_state(
    state: &AppState,
    subject_id: String,
) -> AppResult<Vec<String>> {
    match state
        .with_database(|database| Ok(bank_generated_dates_for_database(database, subject_id)))
    {
        Ok(result) => result,
        Err(error) => AppResult::error("bank.generated_dates_failed", error.to_string()),
    }
}

pub fn bank_find_duplicates_from_state(
    state: &AppState,
    subject_id: String,
) -> AppResult<Vec<DuplicateQuestionGroup>> {
    match state
        .with_database(|database| Ok(bank_find_duplicates_for_database(database, subject_id)))
    {
        Ok(result) => result,
        Err(error) => AppResult::error("bank.find_duplicates_failed", error.to_string()),
    }
}

pub fn bank_reset_generated_dates_from_state(
    state: &AppState,
    subject_id: String,
    publish_dates: Vec<String>,
) -> AppResult<()> {
    match state.with_database(|database| {
        Ok(bank_reset_generated_dates_for_database(
            database,
            subject_id,
            publish_dates,
        ))
    }) {
        Ok(result) => result,
        Err(error) => AppResult::error("bank.reset_generated_dates_failed", error.to_string()),
    }
}

#[tauri::command]
pub fn bank_summary(
    state: tauri::State<'_, AppState>,
    subject_id: String,
) -> AppResult<BankSummary> {
    bank_summary_from_state(&state, subject_id)
}

#[tauri::command]
pub fn bank_search(
    state: tauri::State<'_, AppState>,
    search: QuestionSearch,
) -> AppResult<Vec<Question>> {
    bank_search_from_state(&state, search)
}

#[tauri::command]
pub fn bank_search_paged(
    state: tauri::State<'_, AppState>,
    search: PagedQuestionSearch,
) -> AppResult<PagedQuestionResult> {
    bank_search_paged_from_state(&state, search)
}

#[tauri::command]
pub fn bank_create(state: tauri::State<'_, AppState>, question: NewQuestion) -> AppResult<String> {
    bank_create_from_state(&state, question)
}

#[tauri::command]
pub fn bank_update(state: tauri::State<'_, AppState>, question: UpdateQuestion) -> AppResult<()> {
    bank_update_from_state(&state, question)
}

#[tauri::command]
pub fn bank_delete(state: tauri::State<'_, AppState>, question_ids: Vec<String>) -> AppResult<()> {
    bank_delete_from_state(&state, question_ids)
}

#[tauri::command]
pub fn bank_reset_drawn(
    state: tauri::State<'_, AppState>,
    subject_id: String,
    question_ids: Vec<String>,
) -> AppResult<()> {
    bank_reset_drawn_from_state(&state, subject_id, question_ids)
}

#[tauri::command]
pub fn bank_mark_drawn(
    state: tauri::State<'_, AppState>,
    subject_id: String,
    question_ids: Vec<String>,
    publish_date: String,
) -> AppResult<()> {
    bank_mark_drawn_from_state(&state, subject_id, question_ids, publish_date)
}

#[tauri::command]
pub fn bank_generated_dates(
    state: tauri::State<'_, AppState>,
    subject_id: String,
) -> AppResult<Vec<String>> {
    bank_generated_dates_from_state(&state, subject_id)
}

#[tauri::command]
pub fn bank_find_duplicates(
    state: tauri::State<'_, AppState>,
    subject_id: String,
) -> AppResult<Vec<DuplicateQuestionGroup>> {
    bank_find_duplicates_from_state(&state, subject_id)
}

#[tauri::command]
pub fn bank_reset_generated_dates(
    state: tauri::State<'_, AppState>,
    subject_id: String,
    publish_dates: Vec<String>,
) -> AppResult<()> {
    bank_reset_generated_dates_from_state(&state, subject_id, publish_dates)
}

fn add_question_type_count(
    counts: &mut QuestionTypeCounts,
    question_type: &QuestionType,
    amount: usize,
) {
    match question_type {
        QuestionType::SingleChoice => counts.single_choice += amount,
        QuestionType::MultipleChoice => counts.multiple_choice += amount,
        QuestionType::ShortAnswer => counts.short_answer += amount,
        QuestionType::Essay => counts.essay += amount,
    }
}

fn normalize_duplicate_key(value: &str) -> String {
    value
        .chars()
        .filter_map(|character| {
            let normalized = match character {
                '，' | '。' | '？' | '！' | '；' | '：' | '（' | '）' | '【' | '】' | '、'
                | ',' | '.' | '?' | '!' | ';' | ':' | '(' | ')' | '[' | ']' | '"' | '\'' => None,
                _ if character.is_whitespace() => None,
                _ => Some(character.to_lowercase().collect::<String>()),
            };
            normalized
        })
        .collect::<Vec<_>>()
        .join("")
}
