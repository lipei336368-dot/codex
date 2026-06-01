use serde::Serialize;
use std::collections::HashSet;
use std::io::{Cursor, Write};

use crate::app_state::AppState;
use crate::commands::result::AppResult;
use crate::domain::chapter::{all_chapters, Chapter};
use crate::domain::question::{NewOption, Question, QuestionSearch};
use crate::storage::database::Database;

#[derive(Serialize)]
struct ExportPayload {
    questions: Vec<ExportQuestion>,
}

#[derive(Serialize)]
struct ExportQuestion {
    subject_id: String,
    chapter_id: String,
    question_type: String,
    stem: String,
    answer: Option<String>,
    analysis: Option<String>,
    options: Vec<NewOption>,
    stem_image_path: Option<String>,
    answer_image_path: Option<String>,
    analysis_image_path: Option<String>,
    source_school: Option<String>,
    source_year: Option<String>,
}

pub fn export_json_for_database(database: &Database, search: QuestionSearch) -> AppResult<String> {
    let questions = match database.search_questions(search) {
        Ok(questions) => questions,
        Err(error) => return AppResult::error("export.search_failed", error.to_string()),
    };

    let mut export_questions = Vec::new();
    for question in questions {
        let options = match database.question_options(&question.id) {
            Ok(options) => options,
            Err(error) => return AppResult::error("export.options_failed", error.to_string()),
        };
        export_questions.push(to_export_question(question, options));
    }

    match serde_json::to_string_pretty(&ExportPayload {
        questions: export_questions,
    }) {
        Ok(json) => AppResult::ok(json),
        Err(error) => AppResult::error("export.json_failed", error.to_string()),
    }
}

pub fn export_json_by_ids_for_database(
    database: &Database,
    subject_id: String,
    question_ids: Vec<String>,
) -> AppResult<String> {
    let export_questions = match export_questions_by_ids(database, subject_id, question_ids) {
        Ok(questions) => questions,
        Err((code, message)) => return AppResult::error(&code, message),
    };

    match serde_json::to_string_pretty(&ExportPayload {
        questions: export_questions,
    }) {
        Ok(json) => AppResult::ok(json),
        Err(error) => AppResult::error("export.json_failed", error.to_string()),
    }
}

pub fn export_docx_by_ids_for_database(
    database: &Database,
    subject_id: String,
    question_ids: Vec<String>,
) -> AppResult<Vec<u8>> {
    let export_questions = match export_questions_by_ids(database, subject_id, question_ids) {
        Ok(questions) => questions,
        Err((code, message)) => return AppResult::error(&code, message),
    };

    match build_docx_package(&export_questions) {
        Ok(bytes) => AppResult::ok(bytes),
        Err(error) => AppResult::error("export.docx_failed", error),
    }
}

pub fn export_docx_by_ids_to_path_for_database(
    database: &Database,
    subject_id: String,
    question_ids: Vec<String>,
    path: String,
) -> AppResult<()> {
    let bytes = match export_docx_by_ids_for_database(database, subject_id, question_ids) {
        AppResult {
            ok: true,
            data: Some(bytes),
            ..
        } => bytes,
        AppResult {
            error: Some(error), ..
        } => return AppResult::error(&error.code, error.message),
        _ => return AppResult::error("export.docx_failed", "failed to build docx"),
    };

    match std::fs::write(path, bytes) {
        Ok(()) => AppResult::ok(()),
        Err(error) => AppResult::error("export.docx_write_failed", error.to_string()),
    }
}

fn export_questions_by_ids(
    database: &Database,
    subject_id: String,
    question_ids: Vec<String>,
) -> Result<Vec<ExportQuestion>, (String, String)> {
    let selected_ids = question_ids.into_iter().collect::<HashSet<_>>();
    let questions = match database.search_questions(QuestionSearch {
        subject_id,
        chapter_id: None,
        question_type: None,
        query: None,
        include_drawn: true,
    }) {
        Ok(questions) => questions
            .into_iter()
            .filter(|question| selected_ids.contains(&question.id))
            .collect::<Vec<_>>(),
        Err(error) => {
            return Err(("export.search_failed".to_string(), error.to_string()));
        }
    };

    let mut export_questions = Vec::new();
    for question in questions {
        let options = match database.question_options(&question.id) {
            Ok(options) => options,
            Err(error) => {
                return Err(("export.options_failed".to_string(), error.to_string()));
            }
        };
        export_questions.push(to_export_question(question, options));
    }

    Ok(export_questions)
}

pub fn export_json_from_state(state: &AppState, search: QuestionSearch) -> AppResult<String> {
    match state.with_database(|database| Ok(export_json_for_database(database, search))) {
        Ok(result) => result,
        Err(error) => AppResult::error("export.json_failed", error.to_string()),
    }
}

pub fn export_json_by_ids_from_state(
    state: &AppState,
    subject_id: String,
    question_ids: Vec<String>,
) -> AppResult<String> {
    match state.with_database(|database| {
        Ok(export_json_by_ids_for_database(
            database,
            subject_id,
            question_ids,
        ))
    }) {
        Ok(result) => result,
        Err(error) => AppResult::error("export.json_failed", error.to_string()),
    }
}

pub fn export_docx_by_ids_to_path_from_state(
    state: &AppState,
    subject_id: String,
    question_ids: Vec<String>,
    path: String,
) -> AppResult<()> {
    match state.with_database(|database| {
        Ok(export_docx_by_ids_to_path_for_database(
            database,
            subject_id,
            question_ids,
            path,
        ))
    }) {
        Ok(result) => result,
        Err(error) => AppResult::error("export.docx_failed", error.to_string()),
    }
}

#[tauri::command]
pub fn export_json(state: tauri::State<'_, AppState>, search: QuestionSearch) -> AppResult<String> {
    export_json_from_state(&state, search)
}

#[tauri::command]
pub fn export_json_by_ids(
    state: tauri::State<'_, AppState>,
    subject_id: String,
    question_ids: Vec<String>,
) -> AppResult<String> {
    export_json_by_ids_from_state(&state, subject_id, question_ids)
}

#[tauri::command]
pub fn export_docx_by_ids_to_path(
    state: tauri::State<'_, AppState>,
    subject_id: String,
    question_ids: Vec<String>,
    path: String,
) -> AppResult<()> {
    export_docx_by_ids_to_path_from_state(&state, subject_id, question_ids, path)
}

fn to_export_question(question: Question, options: Vec<NewOption>) -> ExportQuestion {
    ExportQuestion {
        subject_id: question.subject_id,
        chapter_id: question.chapter_id,
        question_type: export_question_type(&question.question_type),
        stem: question.stem,
        answer: question.answer,
        analysis: question.analysis,
        options,
        stem_image_path: question.stem_image_path,
        answer_image_path: question.answer_image_path,
        analysis_image_path: question.analysis_image_path,
        source_school: question.source_school,
        source_year: question.source_year,
    }
}

fn export_question_type(question_type: &crate::domain::question::QuestionType) -> String {
    match question_type {
        crate::domain::question::QuestionType::Essay => "short_answer".to_string(),
        _ => question_type.as_str().to_string(),
    }
}

fn build_docx_package(questions: &[ExportQuestion]) -> Result<Vec<u8>, String> {
    let cursor = Cursor::new(Vec::new());
    let mut zip = zip::ZipWriter::new(cursor);
    let options =
        zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored);

    add_zip_file(
        &mut zip,
        "[Content_Types].xml",
        content_types_xml(),
        options,
    )?;
    add_zip_file(&mut zip, "_rels/.rels", root_rels_xml(), options)?;
    add_zip_file(&mut zip, "word/styles.xml", styles_xml(), options)?;
    add_zip_file(
        &mut zip,
        "word/document.xml",
        document_xml(questions),
        options,
    )?;
    add_zip_file(
        &mut zip,
        "word/_rels/document.xml.rels",
        document_rels_xml(),
        options,
    )?;

    zip.finish()
        .map(|cursor| cursor.into_inner())
        .map_err(|error| error.to_string())
}

fn add_zip_file(
    zip: &mut zip::ZipWriter<Cursor<Vec<u8>>>,
    path: &str,
    content: String,
    options: zip::write::SimpleFileOptions,
) -> Result<(), String> {
    zip.start_file(path, options)
        .map_err(|error| error.to_string())?;
    zip.write_all(content.as_bytes())
        .map_err(|error| error.to_string())
}

fn content_types_xml() -> String {
    r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>"#
        .to_string()
}

fn root_rels_xml() -> String {
    r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"#
        .to_string()
}

fn document_rels_xml() -> String {
    r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>"#
        .to_string()
}

fn styles_xml() -> String {
    r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="宋体"/>
      <w:sz w:val="22"/>
      <w:szCs w:val="22"/>
    </w:rPr>
    <w:pPr>
      <w:spacing w:after="120" w:line="360" w:lineRule="auto"/>
    </w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="宋体"/>
      <w:b/>
      <w:color w:val="1F4E79"/>
      <w:sz w:val="36"/>
      <w:szCs w:val="36"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr>
      <w:spacing w:before="300" w:after="120"/>
      <w:shd w:val="clear" w:color="auto" w:fill="D9EAF7"/>
      <w:pBdr>
        <w:left w:val="single" w:sz="18" w:space="8" w:color="2F5597"/>
      </w:pBdr>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="宋体"/>
      <w:b/>
      <w:color w:val="2F5597"/>
      <w:sz w:val="28"/>
      <w:szCs w:val="28"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:pPr>
      <w:spacing w:before="180" w:after="80"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="宋体"/>
      <w:b/>
      <w:color w:val="538135"/>
      <w:sz w:val="24"/>
      <w:szCs w:val="24"/>
    </w:rPr>
  </w:style>
</w:styles>"#
        .to_string()
}

fn document_xml(questions: &[ExportQuestion]) -> String {
    let mut body = String::new();
    body.push_str(&paragraph_with_style("毅研每日一题题库导出", "Title"));

    let mut ordered_questions = questions.iter().enumerate().collect::<Vec<_>>();
    ordered_questions.sort_by_key(|(index, question)| {
        (
            chapter_order(&question.chapter_id),
            question_type_order(&question.question_type),
            *index,
        )
    });

    let mut current_chapter_id = String::new();
    let mut current_question_type = String::new();
    let mut question_number = 1usize;
    for (_index, question) in ordered_questions {
        if question.chapter_id != current_chapter_id {
            current_chapter_id = question.chapter_id.clone();
            current_question_type.clear();
            body.push_str(&paragraph_with_style(
                &chapter_name(&question.chapter_id),
                "Heading1",
            ));
        }
        if question.question_type != current_question_type {
            current_question_type = question.question_type.clone();
            body.push_str(&paragraph_with_style(
                question_type_label(&question.question_type),
                "Heading2",
            ));
        }

        body.push_str(&paragraph(&format!(
            "{}. {}",
            question_number, question.stem
        )));
        for option in &question.options {
            let text = option.text.as_deref().unwrap_or("");
            body.push_str(&paragraph(&format!("{}. {}", option.label, text)));
        }
        if let Some(answer) = question.answer.as_deref() {
            body.push_str(&paragraph(&format!("答案：{answer}")));
        }
        if let Some(analysis) = question.analysis.as_deref() {
            body.push_str(&paragraph(&format!("解析：{analysis}")));
        }
        question_number += 1;
    }

    format!(
        r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {body}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
      <w:cols w:space="720"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>
  </w:body>
</w:document>"#
    )
}

fn chapter_name(chapter_id: &str) -> String {
    find_chapter(chapter_id)
        .map(|chapter| chapter.name.to_string())
        .unwrap_or_else(|| chapter_id.to_string())
}

fn chapter_order(chapter_id: &str) -> i32 {
    find_chapter(chapter_id)
        .map(|chapter| chapter.order)
        .unwrap_or(i32::MAX)
}

fn find_chapter(chapter_id: &str) -> Option<Chapter> {
    all_chapters()
        .into_iter()
        .find(|chapter| chapter.id == chapter_id)
}

fn question_type_order(question_type: &str) -> i32 {
    match question_type {
        "single_choice" => 1,
        "multiple_choice" => 2,
        "short_answer" | "essay" => 3,
        _ => 99,
    }
}

fn paragraph(text: &str) -> String {
    format!(
        r#"<w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="宋体"/></w:rPr><w:t>{}</w:t></w:r></w:p>"#,
        escape_xml(text)
    )
}

fn paragraph_with_style(text: &str, style_id: &str) -> String {
    format!(
        r#"<w:p><w:pPr><w:pStyle w:val="{}"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="宋体"/></w:rPr><w:t>{}</w:t></w:r></w:p>"#,
        escape_xml(style_id),
        escape_xml(text)
    )
}

fn question_type_label(question_type: &str) -> &'static str {
    match question_type {
        "single_choice" => "选择题",
        "multiple_choice" => "多选题",
        "short_answer" | "essay" => "简答论述题",
        _ => "题目",
    }
}

fn escape_xml(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}
