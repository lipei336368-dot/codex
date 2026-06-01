use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use yiyan_daily_question_generator_lib::app_state::AppState;
use yiyan_daily_question_generator_lib::commands::app::{
    app_backup_database_for_state, app_data_directory_for_state,
};
use yiyan_daily_question_generator_lib::commands::bank::{
    bank_create_for_database, bank_delete_for_database, bank_find_duplicates_for_database,
    bank_generated_dates_for_database, bank_mark_drawn_for_database, bank_reset_drawn_for_database,
    bank_reset_generated_dates_for_database, bank_search_for_database,
    bank_search_paged_for_database, bank_summary_for_database, bank_update_for_database,
};
use yiyan_daily_question_generator_lib::commands::chapters::list_chapters;
use yiyan_daily_question_generator_lib::commands::export_questions::{
    export_docx_by_ids_for_database, export_docx_by_ids_to_path_for_database,
    export_json_by_ids_for_database, export_json_for_database,
};
use yiyan_daily_question_generator_lib::commands::files::{
    reveal_path_in_file_manager_for_path, save_question_asset_for_dir, write_binary_file_for_path,
    write_text_file_for_path,
};
use yiyan_daily_question_generator_lib::commands::import_questions::import_json_for_database;
use yiyan_daily_question_generator_lib::commands::result::AppResult;
use yiyan_daily_question_generator_lib::commands::subjects::list_subjects;
use yiyan_daily_question_generator_lib::commands::tasks::tasks_list_for_state;
use yiyan_daily_question_generator_lib::domain::question::{
    NewOption, NewQuestion, PagedQuestionSearch, QuestionSearch, QuestionType, UpdateQuestion,
};
use yiyan_daily_question_generator_lib::storage::database::Database;

fn temp_database_path(test_name: &str) -> PathBuf {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock should be valid")
        .as_nanos();
    std::env::temp_dir().join(format!("yiyan-api-{test_name}-{nonce}.sqlite"))
}

fn open_migrated_database(test_name: &str) -> (Database, PathBuf) {
    let path = temp_database_path(test_name);
    let database = Database::open(&path).expect("database should open");
    database.migrate().expect("migration should pass");
    (database, path)
}

fn open_app_state(test_name: &str) -> (AppState, PathBuf) {
    let path = temp_database_path(test_name);
    let state = AppState::open(&path).expect("state should open");
    (state, path)
}

fn new_question(stem: &str, question_type: QuestionType) -> NewQuestion {
    let (answer, analysis, options) = match question_type {
        QuestionType::SingleChoice | QuestionType::MultipleChoice => (
            Some("A".to_string()),
            Some("解析".to_string()),
            vec![NewOption::text("A", "正确"), NewOption::text("B", "错误")],
        ),
        QuestionType::ShortAnswer | QuestionType::Essay => {
            (Some("答案".to_string()), None, Vec::new())
        }
    };

    NewQuestion {
        subject_id: "pharmaceutics".to_string(),
        chapter_id: "pharmaceutics-01".to_string(),
        question_type,
        stem: stem.to_string(),
        answer,
        analysis,
        options,
        stem_image_path: None,
        answer_image_path: None,
        analysis_image_path: None,
        source_school: None,
        source_year: None,
    }
}

#[test]
fn command_result_serializes_ok_shape() {
    let result = AppResult::ok(vec!["药剂学"]);
    let json = serde_json::to_value(result).expect("result should serialize");

    assert_eq!(json["ok"], true);
    assert_eq!(json["data"][0], "药剂学");
    assert!(json.get("error").is_none());
}

#[test]
fn subjects_command_lists_four_subjects() {
    let result = list_subjects();

    assert!(result.ok);
    let subjects = result.data.expect("subjects should exist");
    assert_eq!(subjects.len(), 4);
    assert_eq!(subjects[0].name, "药剂学");
}

#[test]
fn tasks_command_returns_empty_progress_list_initially() {
    let result = tasks_list_for_state();

    assert!(result.ok);
    assert!(result.data.expect("tasks should exist").is_empty());
}

#[test]
fn app_commands_report_data_directory_and_backup_database() {
    let (state, path) = open_app_state("app_commands_report_data_directory_and_backup_database");
    let backup_path =
        temp_database_path("app_commands_report_data_directory_and_backup_database_backup");

    let data_dir = app_data_directory_for_state(&state)
        .data
        .expect("data directory should exist");
    let backup_result =
        app_backup_database_for_state(&state, backup_path.to_string_lossy().to_string());

    assert_eq!(
        PathBuf::from(data_dir),
        path.parent().expect("database path should have a parent")
    );
    assert!(backup_result.ok);
    assert!(backup_path.exists());

    let _ = fs::remove_file(path);
    let _ = fs::remove_file(backup_path);
}

#[test]
fn chapters_command_lists_2026_syllabus_chapters_for_all_subjects() {
    let cases = [
        (
            "medicinal_chemistry",
            14usize,
            "medicinal_chemistry-14",
            "第十四章 维生素（不做要求）",
        ),
        (
            "pharmaceutics",
            22usize,
            "pharmaceutics-22",
            "第二十二章 药品包装（不做要求）",
        ),
        (
            "pharmaceutical_analysis",
            26usize,
            "pharmaceutical_analysis-26",
            "第二十六章 药物分析新技术概述（不做要求）",
        ),
        (
            "pharmacology",
            48usize,
            "pharmacology-50",
            "第五十章 影响免疫功能的药物（不做要求）",
        ),
    ];

    for (subject_id, expected_count, last_id, last_name) in cases {
        let result = list_chapters(subject_id.to_string());
        assert!(result.ok);
        let chapters = result.data.expect("chapters should exist");
        assert_eq!(chapters.len(), expected_count, "{subject_id} chapter count");
        let last = chapters.last().expect("last chapter should exist");
        assert_eq!(last.id, last_id);
        assert_eq!(last.name, last_name);
        assert!(last.no_requirement);
    }
}

#[test]
fn bank_summary_counts_total_available_and_types() {
    let (database, path) = open_migrated_database("bank_summary_counts_total_available_and_types");
    let drawn_id = database
        .create_question(new_question("已抽选择题", QuestionType::SingleChoice))
        .expect("choice should insert");
    database
        .create_question(new_question("可用简答题", QuestionType::ShortAnswer))
        .expect("short answer should insert");
    database
        .mark_drawn("pharmaceutics", &drawn_id, "2026-05-06", None)
        .expect("mark drawn should pass");

    let result = bank_summary_for_database(&database, "pharmaceutics".to_string());

    assert!(result.ok);
    let summary = result.data.expect("summary should exist");
    assert_eq!(summary.total, 2);
    assert_eq!(summary.available, 1);
    assert_eq!(summary.by_type.single_choice, 1);
    assert_eq!(summary.by_type.short_answer, 1);

    let _ = fs::remove_file(path);
}

#[test]
fn bank_create_adds_question_with_options_to_database() {
    let (database, path) =
        open_migrated_database("bank_create_adds_question_with_options_to_database");

    let result = bank_create_for_database(
        &database,
        new_question("Manual saved choice", QuestionType::SingleChoice),
    );

    assert!(result.ok);
    let question_id = result.data.expect("created question id should exist");
    let questions = database
        .search_questions(QuestionSearch {
            subject_id: "pharmaceutics".to_string(),
            chapter_id: None,
            question_type: Some(QuestionType::SingleChoice),
            query: Some("Manual saved".to_string()),
            include_drawn: true,
        })
        .expect("search should pass");
    assert_eq!(questions.len(), 1);
    assert_eq!(questions[0].id, question_id);
    assert_eq!(questions[0].answer.as_deref(), Some("A"));
    assert_eq!(
        database
            .question_options(&question_id)
            .expect("options should load")
            .len(),
        2
    );

    let _ = fs::remove_file(path);
}

#[test]
fn bank_create_persists_question_and_option_image_paths() {
    let (database, path) =
        open_migrated_database("bank_create_persists_question_and_option_image_paths");
    let mut question = new_question("Image backed question", QuestionType::SingleChoice);
    question.stem_image_path = Some("assets/pharmaceutics/stem.png".to_string());
    question.answer_image_path = Some("assets/pharmaceutics/answer.png".to_string());
    question.analysis_image_path = Some("assets/pharmaceutics/analysis.png".to_string());
    question.options[0].image_path = Some("assets/pharmaceutics/option-a.png".to_string());

    let result = bank_create_for_database(&database, question);

    assert!(result.ok);
    let question_id = result.data.expect("created question id should exist");
    let questions = database
        .search_questions(QuestionSearch {
            subject_id: "pharmaceutics".to_string(),
            chapter_id: None,
            question_type: Some(QuestionType::SingleChoice),
            query: Some("Image backed".to_string()),
            include_drawn: true,
        })
        .expect("search should pass");
    assert_eq!(
        questions[0].stem_image_path.as_deref(),
        Some("assets/pharmaceutics/stem.png")
    );
    assert_eq!(
        questions[0].answer_image_path.as_deref(),
        Some("assets/pharmaceutics/answer.png")
    );
    assert_eq!(
        questions[0].analysis_image_path.as_deref(),
        Some("assets/pharmaceutics/analysis.png")
    );
    let options = database
        .question_options(&question_id)
        .expect("options should load");
    assert_eq!(
        options[0].image_path.as_deref(),
        Some("assets/pharmaceutics/option-a.png")
    );

    let _ = fs::remove_file(path);
}

#[test]
fn save_question_asset_writes_image_under_subject_asset_folder() {
    let base_dir = std::env::temp_dir().join(format!(
        "yiyan-assets-{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should be valid")
            .as_nanos()
    ));

    let result = save_question_asset_for_dir(
        &base_dir,
        "pharmaceutics".to_string(),
        "paste image.PNG".to_string(),
        vec![137, 80, 78, 71],
    );

    assert!(result.ok);
    let path = result.data.expect("asset path should exist");
    assert!(path.ends_with(".png"));
    let bytes = fs::read(&path).expect("asset should be written");
    assert_eq!(bytes, vec![137, 80, 78, 71]);

    let _ = fs::remove_dir_all(base_dir);
}

#[test]
fn bank_search_uses_shared_question_search_contract() {
    let (database, path) =
        open_migrated_database("bank_search_uses_shared_question_search_contract");
    database
        .create_question(new_question("溶胶剂稳定性", QuestionType::SingleChoice))
        .expect("choice should insert");

    let result = bank_search_for_database(
        &database,
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
    assert_eq!(questions[0].stem, "溶胶剂稳定性");

    let _ = fs::remove_file(path);
}

#[test]
fn bank_search_paged_returns_total_and_window() {
    let (database, path) = open_migrated_database("bank_search_paged_returns_total_and_window");
    for index in 0..75 {
        database
            .create_question(new_question(
                &format!("Paged choice {index:02}"),
                QuestionType::SingleChoice,
            ))
            .expect("question should insert");
    }

    let result = bank_search_paged_for_database(
        &database,
        PagedQuestionSearch {
            subject_id: "pharmaceutics".to_string(),
            chapter_id: None,
            question_type: Some(QuestionType::SingleChoice),
            query: Some("Paged choice".to_string()),
            include_drawn: true,
            offset: 50,
            limit: 20,
        },
    );

    assert!(result.ok);
    let page = result.data.expect("page should exist");
    assert_eq!(page.total, 75);
    assert_eq!(page.items.len(), 20);
    assert_eq!(page.items[0].stem, "Paged choice 50");

    let _ = fs::remove_file(path);
}

#[test]
fn bank_update_writes_editable_fields() {
    let (database, path) = open_migrated_database("bank_update_writes_editable_fields");
    let id = database
        .create_question(new_question("更新前题干", QuestionType::SingleChoice))
        .expect("question should insert");

    let result = bank_update_for_database(
        &database,
        UpdateQuestion {
            id,
            chapter_id: "pharmaceutics-02".to_string(),
            stem: "更新后题干".to_string(),
            answer: Some("B".to_string()),
            analysis: Some("更新后解析".to_string()),
            stem_image_path: Some("assets/updated-stem.png".to_string()),
            answer_image_path: Some("assets/updated-answer.png".to_string()),
            analysis_image_path: Some("assets/updated-analysis.png".to_string()),
            options: vec![
                NewOption {
                    label: "A".to_string(),
                    text: Some("Updated wrong".to_string()),
                    image_path: Some("assets/updated-option-a.png".to_string()),
                    is_correct: false,
                },
                NewOption {
                    label: "B".to_string(),
                    text: Some("Updated right".to_string()),
                    image_path: None,
                    is_correct: true,
                },
            ],
        },
    );

    assert!(result.ok);
    let questions = database
        .search_questions(QuestionSearch {
            subject_id: "pharmaceutics".to_string(),
            chapter_id: None,
            question_type: None,
            query: Some("更新后".to_string()),
            include_drawn: true,
        })
        .expect("search should pass");
    assert_eq!(questions[0].stem, "更新后题干");
    assert_eq!(questions[0].chapter_id, "pharmaceutics-02");
    assert_eq!(
        questions[0].stem_image_path.as_deref(),
        Some("assets/updated-stem.png")
    );
    assert_eq!(
        questions[0].answer_image_path.as_deref(),
        Some("assets/updated-answer.png")
    );
    assert_eq!(
        questions[0].analysis_image_path.as_deref(),
        Some("assets/updated-analysis.png")
    );
    let options = database
        .question_options(&questions[0].id)
        .expect("options should load");
    assert_eq!(options[0].text.as_deref(), Some("Updated wrong"));
    assert_eq!(
        options[0].image_path.as_deref(),
        Some("assets/updated-option-a.png")
    );
    assert!(options[1].is_correct);

    let _ = fs::remove_file(path);
}

#[test]
fn bank_delete_soft_deletes_questions() {
    let (database, path) = open_migrated_database("bank_delete_soft_deletes_questions");
    let id = database
        .create_question(new_question("Delete me", QuestionType::SingleChoice))
        .expect("question should insert");

    let result = bank_delete_for_database(&database, vec![id]);

    assert!(result.ok);
    let questions = database
        .search_questions(QuestionSearch {
            subject_id: "pharmaceutics".to_string(),
            chapter_id: None,
            question_type: None,
            query: Some("Delete me".to_string()),
            include_drawn: true,
        })
        .expect("search should pass");
    assert!(questions.is_empty());

    let _ = fs::remove_file(path);
}

#[test]
fn bank_reset_drawn_makes_question_available_again() {
    let (database, path) =
        open_migrated_database("bank_reset_drawn_makes_question_available_again");
    let id = database
        .create_question(new_question("Drawn question", QuestionType::SingleChoice))
        .expect("question should insert");
    database
        .mark_drawn("pharmaceutics", &id, "2026-05-06", None)
        .expect("mark drawn should pass");

    let result = bank_reset_drawn_for_database(&database, "pharmaceutics".to_string(), vec![id]);

    assert!(result.ok);
    let questions = database
        .search_questions(QuestionSearch {
            subject_id: "pharmaceutics".to_string(),
            chapter_id: None,
            question_type: None,
            query: Some("Drawn question".to_string()),
            include_drawn: false,
        })
        .expect("search should pass");
    assert_eq!(questions.len(), 1);
    assert!(!questions[0].drawn);

    let _ = fs::remove_file(path);
}

#[test]
fn bank_mark_drawn_marks_exported_questions_unavailable() {
    let (database, path) =
        open_migrated_database("bank_mark_drawn_marks_exported_questions_unavailable");
    let first_id = database
        .create_question(new_question(
            "Exported drawn one",
            QuestionType::SingleChoice,
        ))
        .expect("first question should insert");
    let second_id = database
        .create_question(new_question(
            "Exported drawn two",
            QuestionType::ShortAnswer,
        ))
        .expect("second question should insert");

    let result = bank_mark_drawn_for_database(
        &database,
        "pharmaceutics".to_string(),
        vec![first_id, second_id],
        "2026-05-06".to_string(),
    );

    assert!(result.ok);
    let questions = database
        .search_questions(QuestionSearch {
            subject_id: "pharmaceutics".to_string(),
            chapter_id: None,
            question_type: None,
            query: Some("Exported drawn".to_string()),
            include_drawn: false,
        })
        .expect("search should pass");
    assert!(questions.is_empty());

    let _ = fs::remove_file(path);
}

#[test]
fn bank_generated_dates_are_scoped_by_subject() {
    let (database, path) = open_migrated_database("bank_generated_dates_are_scoped_by_subject");
    let pharmaceutics_id = database
        .create_question(new_question(
            "Pharmaceutics generated",
            QuestionType::SingleChoice,
        ))
        .expect("pharmaceutics question should insert");
    let mut pharmacology = new_question("Pharmacology generated", QuestionType::SingleChoice);
    pharmacology.subject_id = "pharmacology".to_string();
    pharmacology.chapter_id = "pharmacology-01".to_string();
    let pharmacology_id = database
        .create_question(pharmacology)
        .expect("pharmacology question should insert");
    database
        .mark_drawn("pharmaceutics", &pharmaceutics_id, "2026-05-06", None)
        .expect("pharmaceutics draw should insert");
    database
        .mark_drawn("pharmacology", &pharmacology_id, "2026-05-07", None)
        .expect("pharmacology draw should insert");

    let result = bank_generated_dates_for_database(&database, "pharmaceutics".to_string());

    assert!(result.ok);
    assert_eq!(result.data.expect("dates should exist"), vec!["2026-05-06"]);

    let _ = fs::remove_file(path);
}

#[test]
fn bank_find_duplicates_groups_normalized_stems() {
    let (database, path) = open_migrated_database("bank_find_duplicates_groups_normalized_stems");
    database
        .create_question(new_question("溶胶剂稳定性？", QuestionType::SingleChoice))
        .expect("first duplicate should insert");
    database
        .create_question(new_question("溶胶剂 稳定性", QuestionType::SingleChoice))
        .expect("second duplicate should insert");
    database
        .create_question(new_question("完全不同的题目", QuestionType::SingleChoice))
        .expect("different question should insert");

    let result = bank_find_duplicates_for_database(&database, "pharmaceutics".to_string());

    assert!(result.ok);
    let groups = result.data.expect("groups should exist");
    assert_eq!(groups.len(), 1);
    assert_eq!(groups[0].questions.len(), 2);
    assert_eq!(groups[0].key, "溶胶剂稳定性");

    let _ = fs::remove_file(path);
}

#[test]
fn bank_reset_generated_dates_only_clears_selected_subject_dates() {
    let (database, path) =
        open_migrated_database("bank_reset_generated_dates_only_clears_selected_subject_dates");
    let first_id = database
        .create_question(new_question(
            "Reset generated date one",
            QuestionType::SingleChoice,
        ))
        .expect("first question should insert");
    let second_id = database
        .create_question(new_question(
            "Reset generated date two",
            QuestionType::SingleChoice,
        ))
        .expect("second question should insert");
    let mut other_subject_question =
        new_question("Other subject generated date", QuestionType::SingleChoice);
    other_subject_question.subject_id = "pharmacology".to_string();
    other_subject_question.chapter_id = "pharmacology-01".to_string();
    let other_subject_id = database
        .create_question(other_subject_question)
        .expect("other subject question should insert");

    database
        .mark_drawn("pharmaceutics", &first_id, "2026-05-06", None)
        .expect("first draw should insert");
    database
        .mark_drawn("pharmaceutics", &second_id, "2026-05-07", None)
        .expect("second draw should insert");
    database
        .mark_drawn("pharmacology", &other_subject_id, "2026-05-06", None)
        .expect("other subject draw should insert");

    let result = bank_reset_generated_dates_for_database(
        &database,
        "pharmaceutics".to_string(),
        vec!["2026-05-06".to_string()],
    );

    assert!(result.ok);
    let pharmaceutics_dates =
        bank_generated_dates_for_database(&database, "pharmaceutics".to_string())
            .data
            .expect("pharmaceutics dates should exist");
    let pharmacology_dates =
        bank_generated_dates_for_database(&database, "pharmacology".to_string())
            .data
            .expect("pharmacology dates should exist");
    assert_eq!(pharmaceutics_dates, vec!["2026-05-07"]);
    assert_eq!(pharmacology_dates, vec!["2026-05-06"]);

    let _ = fs::remove_file(path);
}

#[test]
fn import_json_resolves_no_requirement_chapter_alias_from_original_syllabus_text() {
    let (database, path) = open_migrated_database(
        "import_json_resolves_no_requirement_chapter_alias_from_original_syllabus_text",
    );
    let json_text = r#"
    [
      {
        "章节": "第十四章 维生素（不作要求）",
        "题型": "简答题",
        "题目": "药物化学不做要求章节别名导入测试",
        "答案": "用于验证不作要求与不做要求兼容。"
      }
    ]
    "#;

    let result = import_json_for_database(
        &database,
        "medicinal_chemistry".to_string(),
        json_text.to_string(),
    );

    assert!(result.ok);
    let report = result.data.expect("report should exist");
    assert_eq!(report.added, 1);
    assert_eq!(report.skipped, 0);

    let questions = database
        .search_questions(QuestionSearch {
            subject_id: "medicinal_chemistry".to_string(),
            chapter_id: Some("medicinal_chemistry-14".to_string()),
            question_type: Some(QuestionType::ShortAnswer),
            query: Some("别名导入测试".to_string()),
            include_drawn: true,
        })
        .expect("search should pass");
    assert_eq!(questions.len(), 1);

    let _ = fs::remove_file(path);
}

#[test]
fn import_json_adds_valid_questions_and_reports_invalid_ones() {
    let (database, path) =
        open_migrated_database("import_json_adds_valid_questions_and_reports_invalid_ones");
    let json_text = r#"
    [
      {
        "chapter_id": "pharmaceutics-01",
        "question_type": "single_choice",
        "stem": "Imported valid choice",
        "options": [
          { "label": "A", "text": "Right" },
          { "label": "B", "text": "Wrong" }
        ],
        "answer": "A",
        "analysis": "A is right."
      },
      {
        "chapter_id": "pharmaceutics-01",
        "question_type": "short_answer",
        "stem": "Imported invalid short answer",
        "answer": ""
      }
    ]
    "#;

    let result = import_json_for_database(
        &database,
        "pharmaceutics".to_string(),
        json_text.to_string(),
    );

    assert!(result.ok);
    let report = result.data.expect("report should exist");
    assert_eq!(report.added, 1);
    assert_eq!(report.skipped, 1);
    assert_eq!(report.errors_count, 1);
    let questions = database
        .search_questions(QuestionSearch {
            subject_id: "pharmaceutics".to_string(),
            chapter_id: None,
            question_type: None,
            query: Some("Imported".to_string()),
            include_drawn: true,
        })
        .expect("search should pass");
    assert_eq!(questions.len(), 1);
    assert_eq!(questions[0].stem, "Imported valid choice");

    let _ = fs::remove_file(path);
}

#[test]
fn short_answer_search_includes_legacy_essay_questions() {
    let (database, path) = open_migrated_database("short_answer_search_includes_legacy_essay_questions");
    database
        .create_question(new_question("legacy essay stem", QuestionType::Essay))
        .expect("legacy essay should save");
    database
        .create_question(new_question("new open answer stem", QuestionType::ShortAnswer))
        .expect("short answer should save");

    let questions = database
        .search_questions(QuestionSearch {
            subject_id: "pharmaceutics".to_string(),
            chapter_id: None,
            question_type: Some(QuestionType::ShortAnswer),
            query: Some("stem".to_string()),
            include_drawn: true,
        })
        .expect("search should pass");
    assert_eq!(questions.len(), 2);

    let page = database
        .search_questions_paged(PagedQuestionSearch {
            subject_id: "pharmaceutics".to_string(),
            chapter_id: None,
            question_type: Some(QuestionType::ShortAnswer),
            query: Some("stem".to_string()),
            include_drawn: true,
            offset: 0,
            limit: 80,
        })
        .expect("paged search should pass");
    assert_eq!(page.total, 2);
    assert_eq!(page.items.len(), 2);

    let _ = fs::remove_file(path);
}

#[test]
fn bank_search_orders_all_question_types_for_picker_display() {
    let (database, path) = open_migrated_database("bank_search_orders_all_question_types_for_picker_display");
    database
        .create_question(new_question("sort open answer", QuestionType::ShortAnswer))
        .expect("short answer should save");
    database
        .create_question(new_question("sort multiple choice", QuestionType::MultipleChoice))
        .expect("multiple choice should save");
    database
        .create_question(new_question("sort single choice", QuestionType::SingleChoice))
        .expect("single choice should save");

    let questions = database
        .search_questions(QuestionSearch {
            subject_id: "pharmaceutics".to_string(),
            chapter_id: None,
            question_type: None,
            query: Some("sort".to_string()),
            include_drawn: true,
        })
        .expect("search should pass");

    assert_eq!(
        questions
            .iter()
            .map(|question| question.question_type.clone())
            .collect::<Vec<_>>(),
        vec![
            QuestionType::SingleChoice,
            QuestionType::MultipleChoice,
            QuestionType::ShortAnswer
        ]
    );

    let _ = fs::remove_file(path);
}

#[test]
fn import_json_normalizes_legacy_essay_type_to_short_answer() {
    let (database, path) = open_migrated_database("import_json_normalizes_legacy_essay_type_to_short_answer");
    let json_text = r#"
    [
      {
        "chapter_id": "pharmaceutics-01",
        "question_type": "essay",
        "stem": "legacy essay import",
        "answer": "open answer"
      }
    ]
    "#;

    let result = import_json_for_database(
        &database,
        "pharmaceutics".to_string(),
        json_text.to_string(),
    );

    assert!(result.ok);
    let report = result.data.expect("report should exist");
    assert_eq!(report.added, 1);
    assert_eq!(report.skipped, 0);

    let questions = database
        .search_questions(QuestionSearch {
            subject_id: "pharmaceutics".to_string(),
            chapter_id: None,
            question_type: Some(QuestionType::ShortAnswer),
            query: Some("legacy essay import".to_string()),
            include_drawn: true,
        })
        .expect("search should pass");
    assert_eq!(questions.len(), 1);
    assert_eq!(questions[0].question_type, QuestionType::ShortAnswer);

    let _ = fs::remove_file(path);
}

#[test]
fn import_json_reads_nested_chapters_and_question_groups() {
    let (database, path) =
        open_migrated_database("import_json_reads_nested_chapters_and_question_groups");
    let json_text = r#"
    {
      "chapters": [
        {
          "chapter_id": "pharmaceutics-02",
          "question_types": [
            {
              "question_type": "short_answer",
              "questions": [
                {
                  "stem": "Nested imported short answer",
                  "answer": "Use total-then-points format."
                }
              ]
            }
          ]
        }
      ]
    }
    "#;

    let result = import_json_for_database(
        &database,
        "pharmaceutics".to_string(),
        json_text.to_string(),
    );

    assert!(result.ok);
    let report = result.data.expect("report should exist");
    assert_eq!(report.added, 1);
    assert_eq!(report.skipped, 0);
    let questions = database
        .search_questions(QuestionSearch {
            subject_id: "pharmaceutics".to_string(),
            chapter_id: Some("pharmaceutics-02".to_string()),
            question_type: Some(QuestionType::ShortAnswer),
            query: Some("Nested imported".to_string()),
            include_drawn: true,
        })
        .expect("search should pass");
    assert_eq!(questions.len(), 1);

    let _ = fs::remove_file(path);
}

#[test]
fn import_json_accepts_chinese_field_names() {
    let (database, path) = open_migrated_database("import_json_accepts_chinese_field_names");
    let json_text = r#"
    [
      {
        "章节": "第一章 绪论",
        "题型": "简答题",
        "题目": "中文字段导入题",
        "答案": "可以被正常导入。"
      }
    ]
    "#;

    let result = import_json_for_database(
        &database,
        "pharmaceutics".to_string(),
        json_text.to_string(),
    );

    assert!(result.ok);
    let report = result.data.expect("report should exist");
    assert_eq!(report.added, 1);
    assert_eq!(report.skipped, 0);
    let questions = database
        .search_questions(QuestionSearch {
            subject_id: "pharmaceutics".to_string(),
            chapter_id: Some("pharmaceutics-01".to_string()),
            question_type: Some(QuestionType::ShortAnswer),
            query: Some("中文字段".to_string()),
            include_drawn: true,
        })
        .expect("search should pass");
    assert_eq!(questions.len(), 1);

    let _ = fs::remove_file(path);
}

#[test]
fn import_json_accepts_object_map_options() {
    let (database, path) = open_migrated_database("import_json_accepts_object_map_options");
    let json_text = r#"
    [
      {
        "章节": "第二章 药物的物理化学相互作用",
        "题型": "选择题",
        "题目": "对象形式选项也应该能导入（ ）。",
        "选项": {
          "A": "可以导入",
          "B": "不能导入",
          "C": "只能手动修改",
          "D": "会丢失选项"
        },
        "答案": "A",
        "解析": "对象形式选项是常见 JSON 写法，导入器应兼容。"
      }
    ]
    "#;

    let result = import_json_for_database(
        &database,
        "pharmaceutics".to_string(),
        json_text.to_string(),
    );

    assert!(result.ok);
    let report = result.data.expect("report should exist");
    assert_eq!(report.added, 1);
    assert_eq!(report.skipped, 0);
    let questions = database
        .search_questions(QuestionSearch {
            subject_id: "pharmaceutics".to_string(),
            chapter_id: Some("pharmaceutics-02".to_string()),
            question_type: Some(QuestionType::SingleChoice),
            query: Some("对象形式选项".to_string()),
            include_drawn: true,
        })
        .expect("search should pass");
    assert_eq!(questions.len(), 1);
    let options = database
        .question_options(&questions[0].id)
        .expect("options should load");
    assert_eq!(options.len(), 4);
    assert_eq!(options[0].label, "A");
    assert_eq!(options[0].text.as_deref(), Some("可以导入"));
    assert!(options[0].is_correct);

    let _ = fs::remove_file(path);
}

#[test]
fn import_real_chapter_json_files_when_available() {
    let Ok(fixtures) = std::env::var("YIYAN_REAL_CHAPTER_JSON_FIXTURES") else {
        eprintln!("skipping real chapter JSON import test; set YIYAN_REAL_CHAPTER_JSON_FIXTURES to a semicolon-separated list of local fixture paths to enable it");
        return;
    };
    let fixture_paths = fixtures
        .split(';')
        .map(str::trim)
        .filter(|fixture_path| !fixture_path.is_empty())
        .collect::<Vec<_>>();
    let available_fixtures = fixture_paths
        .iter()
        .filter(|fixture_path| PathBuf::from(fixture_path).exists())
        .collect::<Vec<_>>();

    assert!(
        !available_fixtures.is_empty(),
        "expected at least one real chapter JSON fixture to exist; checked: {}",
        fixture_paths.join(", ")
    );

    for fixture_path in available_fixtures {
        let (database, path) = open_migrated_database("import_real_chapter_json_files_when_available");
        let json_text = fs::read_to_string(fixture_path)
            .unwrap_or_else(|error| panic!("failed to read real fixture {fixture_path}: {error}"));

        let result = import_json_for_database(
            &database,
            "pharmaceutics".to_string(),
            json_text,
        );

        assert!(result.ok, "real fixture import should succeed: {fixture_path}");
        let report = result.data.expect("import report should exist");
        assert!(
            report.added > 0,
            "real fixture should import at least one question: {fixture_path}"
        );
        assert_eq!(
            report.errors_count, 0,
            "real fixture should import without validation errors: {fixture_path}"
        );

        let _ = fs::remove_file(path);
    }
}

#[test]
fn realistic_daily_workflow_import_dedupe_export_and_reset() {
    let (database, path) =
        open_migrated_database("realistic_daily_workflow_import_dedupe_export_and_reset");
    let export_path = temp_database_path("realistic_daily_workflow_export").with_extension("docx");
    let json_text = r#"
    {
      "chapters": [
        {
          "chapter_id": "pharmaceutics-01",
          "question_types": [
            {
              "question_type": "single_choice",
              "questions": [
                {
                  "stem": "溶胶剂稳定性的主要原因是（ ）。",
                  "options": [
                    { "label": "A", "text": "范德华引力强" },
                    { "label": "B", "text": "分散相粒子带同种电荷" },
                    { "label": "C", "text": "可自由沉降" },
                    { "label": "D", "text": "属于热力学稳定体系" }
                  ],
                  "answer": "B",
                  "analysis": "同种电荷相互排斥，使胶粒保持分散。"
                },
                {
                  "stem": "溶胶剂 稳定性的主要原因是",
                  "options": [
                    { "label": "A", "text": "范德华引力强" },
                    { "label": "B", "text": "分散相粒子带同种电荷" }
                  ],
                  "answer": "B",
                  "analysis": "重复题用于查重流程。"
                }
              ]
            },
            {
              "question_type": "short_answer",
              "questions": [
                {
                  "stem": "简述保护胶体的作用。",
                  "answer": "保护胶体可吸附于胶粒表面，形成亲水性保护膜，从而提高体系稳定性。"
                }
              ]
            }
          ]
        }
      ]
    }
    "#;

    let import_result = import_json_for_database(
        &database,
        "pharmaceutics".to_string(),
        json_text.to_string(),
    );

    assert!(import_result.ok);
    let report = import_result.data.expect("import report should exist");
    assert_eq!(report.added, 3);
    assert_eq!(report.errors_count, 0);

    let duplicates = bank_find_duplicates_for_database(&database, "pharmaceutics".to_string())
        .data
        .expect("duplicate groups should exist");
    assert_eq!(duplicates.len(), 1);
    let duplicate_delete_ids = duplicates[0]
        .questions
        .iter()
        .skip(1)
        .map(|question| question.id.clone())
        .collect::<Vec<_>>();
    let delete_result = bank_delete_for_database(&database, duplicate_delete_ids);
    assert!(delete_result.ok);

    let available = bank_search_for_database(
        &database,
        QuestionSearch {
            subject_id: "pharmaceutics".to_string(),
            chapter_id: Some("pharmaceutics-01".to_string()),
            question_type: None,
            query: None,
            include_drawn: false,
        },
    )
    .data
    .expect("available questions should exist");
    assert_eq!(available.len(), 2);

    let selected_ids = available
        .iter()
        .map(|question| question.id.clone())
        .collect::<Vec<_>>();
    let json_export = export_json_by_ids_for_database(
        &database,
        "pharmaceutics".to_string(),
        selected_ids.clone(),
    );
    assert!(json_export.ok);
    assert!(json_export
        .data
        .expect("json export should exist")
        .contains("简述保护胶体的作用"));

    let docx_export = export_docx_by_ids_to_path_for_database(
        &database,
        "pharmaceutics".to_string(),
        selected_ids.clone(),
        export_path.to_string_lossy().to_string(),
    );
    assert!(docx_export.ok);
    assert!(export_path.exists());

    let mark_result = bank_mark_drawn_for_database(
        &database,
        "pharmaceutics".to_string(),
        selected_ids,
        "2026-05-06".to_string(),
    );
    assert!(mark_result.ok);
    let dates = bank_generated_dates_for_database(&database, "pharmaceutics".to_string())
        .data
        .expect("generated dates should exist");
    assert_eq!(dates, vec!["2026-05-06"]);

    let reset_result = bank_reset_generated_dates_for_database(
        &database,
        "pharmaceutics".to_string(),
        vec!["2026-05-06".to_string()],
    );
    assert!(reset_result.ok);
    let available_after_reset = bank_search_for_database(
        &database,
        QuestionSearch {
            subject_id: "pharmaceutics".to_string(),
            chapter_id: Some("pharmaceutics-01".to_string()),
            question_type: None,
            query: None,
            include_drawn: false,
        },
    )
    .data
    .expect("available questions after reset should exist");
    assert_eq!(available_after_reset.len(), 2);

    let _ = fs::remove_file(path);
    let _ = fs::remove_file(export_path);
}

#[test]
fn export_json_uses_question_search_and_includes_options() {
    let (database, path) =
        open_migrated_database("export_json_uses_question_search_and_includes_options");
    database
        .create_question(new_question("Exported choice", QuestionType::SingleChoice))
        .expect("choice should insert");
    database
        .create_question(new_question(
            "Other short answer",
            QuestionType::ShortAnswer,
        ))
        .expect("short answer should insert");

    let result = export_json_for_database(
        &database,
        QuestionSearch {
            subject_id: "pharmaceutics".to_string(),
            chapter_id: None,
            question_type: Some(QuestionType::SingleChoice),
            query: Some("Exported".to_string()),
            include_drawn: true,
        },
    );

    assert!(result.ok);
    let json_text = result.data.expect("json should exist");
    let exported: serde_json::Value = serde_json::from_str(&json_text).expect("json should parse");
    assert_eq!(
        exported["questions"]
            .as_array()
            .expect("questions array")
            .len(),
        1
    );
    assert_eq!(exported["questions"][0]["stem"], "Exported choice");
    assert_eq!(exported["questions"][0]["question_type"], "single_choice");
    assert_eq!(exported["questions"][0]["options"][0]["label"], "A");
    assert_eq!(exported["questions"][0]["options"][0]["text"], "正确");

    let _ = fs::remove_file(path);
}

#[test]
fn export_json_normalizes_legacy_essay_type_to_short_answer() {
    let (database, path) =
        open_migrated_database("export_json_normalizes_legacy_essay_type_to_short_answer");
    database
        .create_question(new_question("Legacy essay export", QuestionType::Essay))
        .expect("legacy essay should insert");

    let result = export_json_for_database(
        &database,
        QuestionSearch {
            subject_id: "pharmaceutics".to_string(),
            chapter_id: None,
            question_type: Some(QuestionType::ShortAnswer),
            query: Some("Legacy essay export".to_string()),
            include_drawn: true,
        },
    );

    assert!(result.ok);
    let json_text = result.data.expect("json should exist");
    let exported: serde_json::Value = serde_json::from_str(&json_text).expect("json should parse");
    assert_eq!(exported["questions"][0]["stem"], "Legacy essay export");
    assert_eq!(exported["questions"][0]["question_type"], "short_answer");

    let _ = fs::remove_file(path);
}

#[test]
fn export_json_by_ids_exports_only_selected_questions() {
    let (database, path) =
        open_migrated_database("export_json_by_ids_exports_only_selected_questions");
    let selected_id = database
        .create_question(new_question("Selected export", QuestionType::SingleChoice))
        .expect("selected question should insert");
    database
        .create_question(new_question(
            "Unselected export",
            QuestionType::SingleChoice,
        ))
        .expect("unselected question should insert");

    let result =
        export_json_by_ids_for_database(&database, "pharmaceutics".to_string(), vec![selected_id]);

    assert!(result.ok);
    let json_text = result.data.expect("json should exist");
    let exported: serde_json::Value = serde_json::from_str(&json_text).expect("json should parse");
    assert_eq!(
        exported["questions"]
            .as_array()
            .expect("questions array")
            .len(),
        1
    );
    assert_eq!(exported["questions"][0]["stem"], "Selected export");

    let _ = fs::remove_file(path);
}

#[test]
fn write_text_file_command_writes_utf8_content() {
    let path =
        temp_database_path("write_text_file_command_writes_utf8_content").with_extension("json");

    let result =
        write_text_file_for_path(path.to_string_lossy().to_string(), "中文 JSON".to_string());

    assert!(result.ok);
    let content = fs::read_to_string(&path).expect("file should exist");
    assert_eq!(content, "中文 JSON");

    let _ = fs::remove_file(path);
}

#[test]
fn write_binary_file_command_writes_bytes() {
    let path = temp_database_path("write_binary_file_command_writes_bytes").with_extension("png");

    let result = write_binary_file_for_path(path.to_string_lossy().to_string(), vec![1, 2, 3]);

    assert!(result.ok);
    let bytes = fs::read(&path).expect("file should exist");
    assert_eq!(bytes, vec![1, 2, 3]);

    let _ = fs::remove_file(path);
}

#[test]
fn reveal_path_in_file_manager_rejects_missing_path() {
    let path = temp_database_path("reveal_path_in_file_manager_rejects_missing_path")
        .with_extension("png");

    let result = reveal_path_in_file_manager_for_path(path.to_string_lossy().to_string());

    assert!(!result.ok);
    assert_eq!(
        result.error.expect("error should exist").code,
        "files.reveal_missing"
    );
}

#[test]
fn export_docx_by_ids_creates_word_package_with_selected_questions() {
    let (database, path) =
        open_migrated_database("export_docx_by_ids_creates_word_package_with_selected_questions");
    let selected_id = database
        .create_question(new_question(
            "Selected Word export",
            QuestionType::SingleChoice,
        ))
        .expect("selected question should insert");
    database
        .create_question(new_question(
            "Unselected Word export",
            QuestionType::SingleChoice,
        ))
        .expect("unselected question should insert");

    let result =
        export_docx_by_ids_for_database(&database, "pharmaceutics".to_string(), vec![selected_id]);

    assert!(result.ok);
    let docx = result.data.expect("docx bytes should exist");
    assert!(docx.starts_with(b"PK"));
    let text = String::from_utf8_lossy(&docx);
    assert!(text.contains("[Content_Types].xml"));
    assert!(text.contains("word/document.xml"));
    assert!(text.contains("Selected Word export"));
    assert!(text.contains("A. 正确"));
    assert!(text.contains("宋体"));
    assert!(text.contains("Times New Roman"));
    assert!(!text.contains("Unselected Word export"));

    let _ = fs::remove_file(path);
}

#[test]
fn export_docx_by_ids_to_path_writes_docx_file() {
    let (database, database_path) =
        open_migrated_database("export_docx_by_ids_to_path_writes_docx_file");
    let selected_id = database
        .create_question(new_question("Word file export", QuestionType::ShortAnswer))
        .expect("question should insert");
    let output_path =
        temp_database_path("export_docx_by_ids_to_path_writes_docx_file").with_extension("docx");

    let result = export_docx_by_ids_to_path_for_database(
        &database,
        "pharmaceutics".to_string(),
        vec![selected_id],
        output_path.to_string_lossy().to_string(),
    );

    assert!(result.ok);
    let bytes = fs::read(&output_path).expect("docx should be written");
    assert!(bytes.starts_with(b"PK"));

    let _ = fs::remove_file(database_path);
    let _ = fs::remove_file(output_path);
}

#[test]
fn export_docx_groups_questions_by_chapter_then_type() {
    let (database, path) =
        open_migrated_database("export_docx_groups_questions_by_chapter_then_type");
    let mut chapter_two_choice = new_question("Chapter two choice", QuestionType::SingleChoice);
    chapter_two_choice.chapter_id = "pharmaceutics-02".to_string();
    let chapter_two_choice_id = database
        .create_question(chapter_two_choice)
        .expect("chapter two choice should insert");
    let chapter_one_short_id = database
        .create_question(new_question(
            "Chapter one short answer",
            QuestionType::ShortAnswer,
        ))
        .expect("chapter one short answer should insert");

    let result = export_docx_by_ids_for_database(
        &database,
        "pharmaceutics".to_string(),
        vec![chapter_two_choice_id, chapter_one_short_id],
    );

    assert!(result.ok);
    let text = String::from_utf8_lossy(&result.data.expect("docx bytes should exist")).to_string();
    let chapter_one_index = text.find("第一章 绪论").expect("chapter one should exist");
    let short_type_index = text[chapter_one_index..]
        .find("简答论述题")
        .expect("short answer type should exist")
        + chapter_one_index;
    let short_stem_index = text[short_type_index..]
        .find("Chapter one short answer")
        .expect("short answer stem should exist")
        + short_type_index;
    let chapter_two_index = text
        .find("第二章 药物的物理化学相互作用")
        .expect("chapter two should exist");
    let choice_type_index = text[chapter_two_index..]
        .find("选择题")
        .expect("choice type should exist")
        + chapter_two_index;
    let choice_stem_index = text[choice_type_index..]
        .find("Chapter two choice")
        .expect("choice stem should exist")
        + choice_type_index;

    assert!(chapter_one_index < short_type_index);
    assert!(short_type_index < short_stem_index);
    assert!(short_stem_index < chapter_two_index);
    assert!(chapter_two_index < choice_type_index);
    assert!(choice_type_index < choice_stem_index);

    let _ = fs::remove_file(path);
}

#[test]
fn export_docx_sorts_question_types_inside_same_chapter() {
    let (database, path) =
        open_migrated_database("export_docx_sorts_question_types_inside_same_chapter");
    let short_answer_id = database
        .create_question(new_question(
            "Same chapter short answer",
            QuestionType::ShortAnswer,
        ))
        .expect("short answer should insert");
    let multiple_choice_id = database
        .create_question(new_question(
            "Same chapter multiple choice",
            QuestionType::MultipleChoice,
        ))
        .expect("multiple choice should insert");
    let single_choice_id = database
        .create_question(new_question(
            "Same chapter single choice",
            QuestionType::SingleChoice,
        ))
        .expect("single choice should insert");

    let result = export_docx_by_ids_for_database(
        &database,
        "pharmaceutics".to_string(),
        vec![short_answer_id, multiple_choice_id, single_choice_id],
    );

    assert!(result.ok);
    let text = String::from_utf8_lossy(&result.data.expect("docx bytes should exist")).to_string();
    let single_choice_index = text
        .find("选择题")
        .expect("single choice type should exist");
    let single_choice_stem_index = text[single_choice_index..]
        .find("Same chapter single choice")
        .expect("single choice stem should exist")
        + single_choice_index;
    let multiple_choice_index = text
        .find("多选题")
        .expect("multiple choice type should exist");
    let multiple_choice_stem_index = text[multiple_choice_index..]
        .find("Same chapter multiple choice")
        .expect("multiple choice stem should exist")
        + multiple_choice_index;
    let short_answer_index = text.find("简答论述题").expect("short answer type should exist");
    let short_answer_stem_index = text[short_answer_index..]
        .find("Same chapter short answer")
        .expect("short answer stem should exist")
        + short_answer_index;

    assert!(single_choice_index < single_choice_stem_index);
    assert!(single_choice_stem_index < multiple_choice_index);
    assert!(multiple_choice_index < multiple_choice_stem_index);
    assert!(multiple_choice_stem_index < short_answer_index);
    assert!(short_answer_index < short_answer_stem_index);

    let _ = fs::remove_file(path);
}
