use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use yiyan_daily_question_generator_lib::app_state::AppState;
use yiyan_daily_question_generator_lib::commands::bank::{
    bank_search_from_state, bank_summary_from_state,
};
use yiyan_daily_question_generator_lib::domain::question::{
    NewOption, NewQuestion, QuestionSearch, QuestionType,
};

fn temp_database_path(test_name: &str) -> PathBuf {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock should be valid")
        .as_nanos();
    std::env::temp_dir().join(format!("yiyan-state-{test_name}-{nonce}.sqlite"))
}

fn sample_choice(stem: &str) -> NewQuestion {
    NewQuestion {
        subject_id: "pharmaceutics".to_string(),
        chapter_id: "pharmaceutics-01".to_string(),
        question_type: QuestionType::SingleChoice,
        stem: stem.to_string(),
        answer: Some("A".to_string()),
        analysis: Some("解析".to_string()),
        options: vec![NewOption::text("A", "正确"), NewOption::text("B", "错误")],
        stem_image_path: None,
        answer_image_path: None,
        analysis_image_path: None,
        source_school: None,
        source_year: None,
    }
}

#[test]
fn app_state_opens_and_migrates_database() {
    let path = temp_database_path("app_state_opens_and_migrates_database");

    let state = AppState::open(&path).expect("app state should open database");

    assert!(path.exists());
    assert_eq!(
        state
            .with_database(|database| database.question_count("pharmaceutics"))
            .expect("database call should pass"),
        0
    );

    let _ = fs::remove_file(path);
}

#[test]
fn bank_summary_from_state_reads_managed_database() {
    let path = temp_database_path("bank_summary_from_state_reads_managed_database");
    let state = AppState::open(&path).expect("app state should open database");
    state
        .with_database(|database| database.create_question(sample_choice("状态中的题目")))
        .expect("question should insert");

    let result = bank_summary_from_state(&state, "pharmaceutics".to_string());

    assert!(result.ok);
    assert_eq!(result.data.expect("summary should exist").total, 1);

    let _ = fs::remove_file(path);
}

#[test]
fn bank_search_from_state_reads_managed_database() {
    let path = temp_database_path("bank_search_from_state_reads_managed_database");
    let state = AppState::open(&path).expect("app state should open database");
    state
        .with_database(|database| database.create_question(sample_choice("溶胶剂题目")))
        .expect("question should insert");

    let result = bank_search_from_state(
        &state,
        QuestionSearch {
            subject_id: "pharmaceutics".to_string(),
            chapter_id: None,
            question_type: Some(QuestionType::SingleChoice),
            query: Some("溶胶".to_string()),
            include_drawn: false,
        },
    );

    assert!(result.ok);
    let questions = result.data.expect("questions should exist");
    assert_eq!(questions.len(), 1);
    assert_eq!(questions[0].stem, "溶胶剂题目");

    let _ = fs::remove_file(path);
}
