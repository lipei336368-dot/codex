use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use yiyan_daily_question_generator_lib::domain::chapter::chapters_for_subject;
use yiyan_daily_question_generator_lib::domain::question::{
    NewOption, NewQuestion, QuestionSearch, QuestionType, UpdateQuestion,
};
use yiyan_daily_question_generator_lib::domain::subject::SUBJECTS;
use yiyan_daily_question_generator_lib::storage::database::Database;

fn temp_database_path(test_name: &str) -> PathBuf {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock should be valid")
        .as_nanos();
    std::env::temp_dir().join(format!("yiyan-{test_name}-{nonce}.sqlite"))
}

fn open_migrated_database(test_name: &str) -> (Database, PathBuf) {
    let path = temp_database_path(test_name);
    let database = Database::open(&path).expect("database should open");
    database.migrate().expect("migration should pass");
    (database, path)
}

fn sample_choice_question(stem: &str) -> NewQuestion {
    NewQuestion {
        subject_id: "pharmaceutics".to_string(),
        chapter_id: "pharmaceutics-01".to_string(),
        question_type: QuestionType::SingleChoice,
        stem: stem.to_string(),
        answer: Some("A".to_string()),
        analysis: Some("药剂学解析".to_string()),
        options: vec![NewOption::text("A", "正确"), NewOption::text("B", "错误")],
        stem_image_path: None,
        answer_image_path: None,
        analysis_image_path: None,
        source_school: None,
        source_year: None,
    }
}

#[test]
fn subject_catalog_contains_four_subjects() {
    let names: Vec<&str> = SUBJECTS.iter().map(|subject| subject.name).collect();

    assert_eq!(names, vec!["药剂学", "药理学", "药物化学", "药物分析"]);
}

#[test]
fn chapters_follow_2026_syllabus_catalog() {
    let cases = [
        (
            "medicinal_chemistry",
            14usize,
            "medicinal_chemistry-01",
            1,
            "第一章 绪论",
            "medicinal_chemistry-14",
            14,
            "第十四章 维生素（不做要求）",
            vec![14],
        ),
        (
            "pharmaceutics",
            22usize,
            "pharmaceutics-01",
            1,
            "第一章 绪论",
            "pharmaceutics-22",
            22,
            "第二十二章 药品包装（不做要求）",
            vec![12, 20, 22],
        ),
        (
            "pharmaceutical_analysis",
            26usize,
            "pharmaceutical_analysis-01",
            1,
            "第一章 药物分析概要",
            "pharmaceutical_analysis-26",
            26,
            "第二十六章 药物分析新技术概述（不做要求）",
            vec![11, 14, 15, 16, 19, 20, 21, 26],
        ),
        (
            "pharmacology",
            48usize,
            "pharmacology-01",
            1,
            "第一章 绪言",
            "pharmacology-50",
            50,
            "第五十章 影响免疫功能的药物（不做要求）",
            vec![12, 13, 14, 33, 34, 38, 45, 46, 48, 50],
        ),
    ];

    for (
        subject_id,
        expected_count,
        first_id,
        first_order,
        first_name,
        last_id,
        last_order,
        last_name,
        no_requirement_orders,
    ) in cases
    {
        let chapters = chapters_for_subject(subject_id);
        assert_eq!(chapters.len(), expected_count, "{subject_id} chapter count");
        assert_eq!(chapters[0].id, first_id);
        assert_eq!(chapters[0].order, first_order);
        assert_eq!(chapters[0].name, first_name);
        assert!(!chapters[0].no_requirement);

        let last = chapters.last().expect("chapter list should not be empty");
        assert_eq!(last.id, last_id);
        assert_eq!(last.order, last_order);
        assert_eq!(last.name, last_name);
        assert!(last.no_requirement);

        let flagged_orders = chapters
            .iter()
            .filter(|chapter| chapter.no_requirement)
            .map(|chapter| chapter.order)
            .collect::<Vec<_>>();
        assert_eq!(
            flagged_orders, no_requirement_orders,
            "{subject_id} no requirement orders"
        );

        for chapter in chapters {
            if chapter.no_requirement {
                assert!(
                    chapter.name.ends_with("（不做要求）"),
                    "{} should use normalized no-requirement suffix",
                    chapter.name
                );
                assert!(
                    !chapter.name.contains("不作要求"),
                    "{} should not keep the alternate suffix",
                    chapter.name
                );
            }
        }
    }
}

#[test]
fn pharmacology_keeps_combined_chapter_six_eight_nine_as_one_catalog_item() {
    let chapters = chapters_for_subject("pharmacology");
    let ids = chapters
        .iter()
        .map(|chapter| chapter.id)
        .collect::<Vec<_>>();
    let orders = chapters
        .iter()
        .map(|chapter| chapter.order)
        .collect::<Vec<_>>();

    assert!(ids.contains(&"pharmacology-06-08-09"));
    assert!(!ids.contains(&"pharmacology-08"));
    assert!(!ids.contains(&"pharmacology-09"));
    assert_eq!(orders[0..9], [1, 2, 3, 4, 5, 6, 7, 10, 11]);

    let combined = chapters
        .iter()
        .find(|chapter| chapter.id == "pharmacology-06-08-09")
        .expect("combined chapter should exist");
    assert_eq!(
        combined.name,
        "第六、八、九章 胆碱受体激动药和胆碱受体阻断药"
    );
    assert!(!combined.no_requirement);
    assert_eq!(chapters.last().expect("last chapter").id, "pharmacology-50");
}

#[test]
fn storage_creates_database() {
    let (database, path) = open_migrated_database("storage_creates_database");

    assert!(path.exists());
    assert_eq!(database.question_count("pharmaceutics").unwrap(), 0);

    let _ = fs::remove_file(path);
}

#[test]
fn migration_creates_publish_template_and_job_tables() {
    let (database, path) =
        open_migrated_database("migration_creates_publish_template_and_job_tables");

    let table_names = database.table_names().expect("table names should load");

    assert!(table_names.contains(&"publish_batches".to_string()));
    assert!(table_names.contains(&"publish_batch_items".to_string()));
    assert!(table_names.contains(&"templates".to_string()));
    assert!(table_names.contains(&"import_jobs".to_string()));
    assert!(table_names.contains(&"export_jobs".to_string()));

    let _ = fs::remove_file(path);
}

#[test]
fn questions_are_isolated_by_subject() {
    let (database, path) = open_migrated_database("questions_are_isolated_by_subject");

    database
        .create_question(NewQuestion {
            subject_id: "pharmaceutics".to_string(),
            chapter_id: "pharmaceutics-01".to_string(),
            question_type: QuestionType::SingleChoice,
            stem: "药剂学题目".to_string(),
            answer: Some("A".to_string()),
            analysis: Some("药剂学解析".to_string()),
            options: vec![NewOption::text("A", "正确"), NewOption::text("B", "错误")],
            stem_image_path: None,
            answer_image_path: None,
            analysis_image_path: None,
            source_school: None,
            source_year: None,
        })
        .expect("pharmaceutics question should insert");

    database
        .create_question(NewQuestion {
            subject_id: "pharmacology".to_string(),
            chapter_id: "pharmacology-01".to_string(),
            question_type: QuestionType::ShortAnswer,
            stem: "药理学题目".to_string(),
            answer: Some("药理学答案".to_string()),
            analysis: None,
            options: Vec::new(),
            stem_image_path: None,
            answer_image_path: None,
            analysis_image_path: None,
            source_school: None,
            source_year: None,
        })
        .expect("pharmacology question should insert");

    let pharmaceutics = database
        .search_questions(QuestionSearch {
            subject_id: "pharmaceutics".to_string(),
            chapter_id: None,
            question_type: None,
            query: None,
            include_drawn: true,
        })
        .expect("pharmaceutics search should pass");

    assert_eq!(pharmaceutics.len(), 1);
    assert_eq!(pharmaceutics[0].stem, "药剂学题目");
    assert_eq!(database.question_count("pharmaceutics").unwrap(), 1);
    assert_eq!(database.question_count("pharmacology").unwrap(), 1);

    let _ = fs::remove_file(path);
}

#[test]
fn update_question_changes_editable_fields() {
    let (database, path) = open_migrated_database("update_question_changes_editable_fields");
    let id = database
        .create_question(sample_choice_question("编辑前题干"))
        .expect("question should insert");

    database
        .update_question(UpdateQuestion {
            id,
            chapter_id: "pharmaceutics-02".to_string(),
            stem: "编辑后题干".to_string(),
            answer: Some("B".to_string()),
            analysis: Some("编辑后解析".to_string()),
            stem_image_path: None,
            answer_image_path: None,
            analysis_image_path: None,
            options: vec![
                NewOption {
                    label: "A".to_string(),
                    text: Some("编辑后错误".to_string()),
                    image_path: None,
                    is_correct: false,
                },
                NewOption {
                    label: "B".to_string(),
                    text: Some("编辑后正确".to_string()),
                    image_path: None,
                    is_correct: true,
                },
            ],
        })
        .expect("update should pass");

    let questions = database
        .search_questions(QuestionSearch {
            subject_id: "pharmaceutics".to_string(),
            chapter_id: None,
            question_type: None,
            query: Some("编辑后".to_string()),
            include_drawn: true,
        })
        .expect("search should pass");

    assert_eq!(questions.len(), 1);
    assert_eq!(questions[0].stem, "编辑后题干");
    assert_eq!(questions[0].chapter_id, "pharmaceutics-02");
    assert_eq!(questions[0].answer.as_deref(), Some("B"));
    assert_eq!(questions[0].analysis.as_deref(), Some("编辑后解析"));

    let _ = fs::remove_file(path);
}

#[test]
fn soft_delete_hides_question_from_search() {
    let (database, path) = open_migrated_database("soft_delete_hides_question_from_search");
    let id = database
        .create_question(sample_choice_question("需要删除的题目"))
        .expect("question should insert");

    database
        .delete_questions(&[id])
        .expect("soft delete should pass");

    let questions = database
        .search_questions(QuestionSearch {
            subject_id: "pharmaceutics".to_string(),
            chapter_id: None,
            question_type: None,
            query: None,
            include_drawn: true,
        })
        .expect("search should pass");

    assert!(questions.is_empty());
    assert_eq!(database.question_count("pharmaceutics").unwrap(), 0);

    let _ = fs::remove_file(path);
}

#[test]
fn draw_history_marks_question_unavailable() {
    let (database, path) = open_migrated_database("draw_history_marks_question_unavailable");
    let id = database
        .create_question(sample_choice_question("已经抽过的题目"))
        .expect("question should insert");

    database
        .mark_drawn("pharmaceutics", &id, "2026-05-06", None)
        .expect("mark drawn should pass");

    let available = database
        .search_questions(QuestionSearch {
            subject_id: "pharmaceutics".to_string(),
            chapter_id: None,
            question_type: None,
            query: None,
            include_drawn: false,
        })
        .expect("search should pass");
    let all = database
        .search_questions(QuestionSearch {
            subject_id: "pharmaceutics".to_string(),
            chapter_id: None,
            question_type: None,
            query: None,
            include_drawn: true,
        })
        .expect("search should pass");

    assert!(available.is_empty());
    assert_eq!(all.len(), 1);
    assert!(all[0].drawn);

    let _ = fs::remove_file(path);
}

#[test]
fn search_places_drawn_questions_after_available_questions() {
    let (database, path) =
        open_migrated_database("search_places_drawn_questions_after_available_questions");
    let drawn_id = database
        .create_question(sample_choice_question("先创建但已抽过的题目"))
        .expect("drawn question should insert");
    database
        .mark_drawn("pharmaceutics", &drawn_id, "2026-05-06", None)
        .expect("mark drawn should pass");
    let available_id = database
        .create_question(sample_choice_question("后创建但仍可用的题目"))
        .expect("available question should insert");

    let all = database
        .search_questions(QuestionSearch {
            subject_id: "pharmaceutics".to_string(),
            chapter_id: None,
            question_type: None,
            query: None,
            include_drawn: true,
        })
        .expect("search should pass");

    assert_eq!(all.len(), 2);
    assert_eq!(all[0].id, available_id);
    assert_eq!(all[1].id, drawn_id);
    assert!(!all[0].drawn);
    assert!(all[1].drawn);

    let _ = fs::remove_file(path);
}

#[test]
fn reset_draw_history_makes_question_available() {
    let (database, path) = open_migrated_database("reset_draw_history_makes_question_available");
    let id = database
        .create_question(sample_choice_question("重置后可用的题目"))
        .expect("question should insert");

    database
        .mark_drawn("pharmaceutics", &id, "2026-05-06", None)
        .expect("mark drawn should pass");
    database
        .reset_drawn("pharmaceutics", &[id])
        .expect("reset drawn should pass");

    let available = database
        .search_questions(QuestionSearch {
            subject_id: "pharmaceutics".to_string(),
            chapter_id: None,
            question_type: None,
            query: None,
            include_drawn: false,
        })
        .expect("search should pass");

    assert_eq!(available.len(), 1);
    assert!(!available[0].drawn);

    let _ = fs::remove_file(path);
}
