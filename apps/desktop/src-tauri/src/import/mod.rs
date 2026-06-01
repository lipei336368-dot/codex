use serde::Serialize;
use serde_json::Value;

use crate::domain::chapter::all_chapters;
use crate::domain::question::{NewOption, NewQuestion, QuestionType};

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
pub struct ImportError {
    pub index: usize,
    pub stem: Option<String>,
    pub message: String,
}

#[derive(Clone, Debug, Default, Serialize, PartialEq, Eq)]
pub struct ImportReport {
    pub added: usize,
    pub skipped: usize,
    pub errors_count: usize,
    pub errors: Vec<ImportError>,
}

#[derive(Clone, Debug, Default)]
struct ImportContext {
    chapter_id: Option<String>,
    question_type: Option<QuestionType>,
}

struct QuestionCandidate {
    value: Value,
    context: ImportContext,
}

pub fn validate_standard_json(
    subject_id: &str,
    json_text: &str,
) -> (Vec<NewQuestion>, ImportReport) {
    let parsed: Value = match serde_json::from_str(json_text) {
        Ok(value) => value,
        Err(error) => {
            let mut report = ImportReport::default();
            report.skipped = 1;
            report.errors_count = 1;
            report.errors.push(ImportError {
                index: 0,
                stem: None,
                message: format!("JSON 格式错误：{error}"),
            });
            return (Vec::new(), report);
        }
    };

    let mut candidates = Vec::new();
    collect_candidates(&parsed, ImportContext::default(), &mut candidates);

    let mut valid_questions = Vec::new();
    let mut report = ImportReport::default();
    for (index, candidate) in candidates.into_iter().enumerate() {
        match to_new_question(subject_id, candidate) {
            Ok(question) => valid_questions.push(question),
            Err(error) => {
                report.skipped += 1;
                report.errors.push(ImportError {
                    index: index + 1,
                    ..error
                });
            }
        }
    }

    report.errors_count = report.errors.len();
    (valid_questions, report)
}

fn collect_candidates(value: &Value, context: ImportContext, output: &mut Vec<QuestionCandidate>) {
    match value {
        Value::Array(items) => {
            for item in items {
                collect_candidates(item, context.clone(), output);
            }
        }
        Value::Object(object) => {
            let next_context = ImportContext {
                chapter_id: get_string(value, &["chapter_id", "chapterId", "chapter", "章节"])
                    .or(context.chapter_id),
                question_type: get_string(
                    value,
                    &["question_type", "questionType", "type", "题型"],
                )
                .and_then(|raw| parse_question_type(&raw))
                .or(context.question_type),
            };

            if let Some(chapters) = object.get("chapters").or_else(|| object.get("章节")) {
                collect_candidates(chapters, next_context.clone(), output);
            }
            if let Some(groups) = object
                .get("question_types")
                .or_else(|| object.get("questionTypes"))
                .or_else(|| object.get("types"))
                .or_else(|| object.get("题型"))
            {
                collect_candidates(groups, next_context.clone(), output);
            }
            if let Some(questions) = object.get("questions") {
                collect_candidates(questions, next_context, output);
                return;
            }
            if has_question_stem(value) {
                output.push(QuestionCandidate {
                    value: value.clone(),
                    context: next_context,
                });
            }
        }
        _ => {}
    }
}

fn to_new_question(
    subject_id: &str,
    candidate: QuestionCandidate,
) -> Result<NewQuestion, ImportError> {
    let raw_stem = get_string(
        &candidate.value,
        &["stem", "question", "title", "题干", "题目"],
    );
    let stem = required(raw_stem, &candidate.value, "题干不能为空")?;
    let raw_chapter = get_string(
        &candidate.value,
        &["chapter_id", "chapterId", "chapter", "章节"],
    )
    .or(candidate.context.chapter_id);
    let chapter_id = required(raw_chapter, &candidate.value, "章节不能为空")?;
    let chapter_id = resolve_chapter_id(subject_id, &chapter_id);
    let question_type = get_string(
        &candidate.value,
        &["question_type", "questionType", "type", "题型"],
    )
    .and_then(|raw| parse_question_type(&raw))
    .or(candidate.context.question_type)
    .ok_or_else(|| make_error(&candidate.value, "题型不能为空或无法识别"))?;
    let answer = required(
        get_string(&candidate.value, &["answer", "答案"]),
        &candidate.value,
        "答案不能为空",
    )?;
    let analysis = get_string(&candidate.value, &["analysis", "解析"]);
    let options = parse_options(&candidate.value, &answer);

    if matches!(
        question_type,
        QuestionType::SingleChoice | QuestionType::MultipleChoice
    ) {
        if options.is_empty() {
            return Err(make_error(&candidate.value, "选择题选项不能为空"));
        }
        if analysis.as_deref().unwrap_or("").trim().is_empty() {
            return Err(make_error(&candidate.value, "选择题解析不能为空"));
        }
        let option_labels = options
            .iter()
            .map(|option| option.label.as_str())
            .collect::<Vec<_>>();
        for answer_label in answer_labels(&answer) {
            if !option_labels.contains(&answer_label.as_str()) {
                return Err(make_error(&candidate.value, "选择题答案不在选项中"));
            }
        }
    }

    Ok(NewQuestion {
        subject_id: subject_id.to_string(),
        chapter_id,
        question_type,
        stem,
        answer: Some(answer),
        analysis,
        options,
        stem_image_path: get_string(
            &candidate.value,
            &[
                "stem_image_path",
                "stemImagePath",
                "question_image",
                "题干图片",
            ],
        ),
        answer_image_path: get_string(
            &candidate.value,
            &["answer_image_path", "answerImagePath", "答案图片"],
        ),
        analysis_image_path: get_string(
            &candidate.value,
            &["analysis_image_path", "analysisImagePath", "解析图片"],
        ),
        source_school: get_string(
            &candidate.value,
            &["source_school", "sourceSchool", "school", "学校"],
        ),
        source_year: get_string(
            &candidate.value,
            &["source_year", "sourceYear", "year", "年份"],
        ),
    })
}

fn required(value: Option<String>, source: &Value, message: &str) -> Result<String, ImportError> {
    value
        .map(|text| text.trim().to_string())
        .filter(|text| !text.is_empty())
        .ok_or_else(|| make_error(source, message))
}

fn make_error(source: &Value, message: &str) -> ImportError {
    ImportError {
        index: 0,
        stem: get_string(source, &["stem", "question", "title", "题干", "题目"]),
        message: message.to_string(),
    }
}

fn has_question_stem(value: &Value) -> bool {
    get_string(value, &["stem", "question", "title", "题干", "题目"]).is_some()
}

fn get_string(value: &Value, keys: &[&str]) -> Option<String> {
    let object = value.as_object()?;
    for key in keys {
        if let Some(raw) = object.get(*key) {
            match raw {
                Value::String(text) => return Some(text.trim().to_string()),
                Value::Number(number) => return Some(number.to_string()),
                _ => {}
            }
        }
    }
    None
}

fn parse_question_type(value: &str) -> Option<QuestionType> {
    match value.trim() {
        "single_choice" | "choice" | "single" | "选择题" | "单选题" => {
            Some(QuestionType::SingleChoice)
        }
        "multiple_choice" | "multiple" | "多选题" | "多项选择题" => {
            Some(QuestionType::MultipleChoice)
        }
        "short_answer" | "short" | "short_essay" | "open_answer" | "简答题" | "简答论述题" => {
            Some(QuestionType::ShortAnswer)
        }
        "essay" | "论述题" => Some(QuestionType::ShortAnswer),
        _ => None,
    }
}

fn parse_options(value: &Value, answer: &str) -> Vec<NewOption> {
    let answer_labels = answer_labels(answer);
    let Some(options_value) = value
        .as_object()
        .and_then(|object| object.get("options").or_else(|| object.get("选项")))
    else {
        return Vec::new();
    };

    if let Some(options) = options_value.as_array() {
        return options
            .iter()
            .enumerate()
            .filter_map(|(index, option)| parse_option(index, option, &answer_labels))
            .collect();
    }

    if let Some(options) = options_value.as_object() {
        let mut entries = options.iter().collect::<Vec<_>>();
        entries.sort_by(|(left, _), (right, _)| {
            normalize_option_label(left).cmp(&normalize_option_label(right))
        });
        return entries
            .into_iter()
            .filter_map(|(label, option)| parse_named_option(label, option, &answer_labels))
            .collect();
    }

    Vec::new()
}

fn parse_option(index: usize, value: &Value, answer_labels: &[String]) -> Option<NewOption> {
    let default_label = normalize_option_label(&((b'A' + index as u8) as char).to_string());
    match value {
        Value::String(text) => Some(NewOption {
            label: default_label.clone(),
            text: Some(text.trim().to_string()),
            image_path: None,
            is_correct: answer_labels.contains(&default_label),
        }),
        Value::Object(_) => {
            let label = get_string(value, &["label", "key", "选项"])
                .map(|label| normalize_option_label(&label))
                .unwrap_or(default_label);
            let is_correct = value
                .as_object()
                .and_then(|object| object.get("is_correct").or_else(|| object.get("isCorrect")))
                .and_then(Value::as_bool)
                .unwrap_or_else(|| answer_labels.contains(&label));
            Some(NewOption {
                label,
                text: get_string(value, &["text", "content", "内容"]),
                image_path: get_string(value, &["image_path", "imagePath", "image", "图片"]),
                is_correct,
            })
        }
        _ => None,
    }
}

fn parse_named_option(label: &str, value: &Value, answer_labels: &[String]) -> Option<NewOption> {
    let label = normalize_option_label(label);
    if label.is_empty() {
        return None;
    }

    match value {
        Value::String(text) => Some(NewOption {
            label: label.clone(),
            text: Some(text.trim().to_string()),
            image_path: None,
            is_correct: answer_labels.contains(&label),
        }),
        Value::Object(_) => {
            let is_correct = value
                .as_object()
                .and_then(|object| object.get("is_correct").or_else(|| object.get("isCorrect")))
                .and_then(Value::as_bool)
                .unwrap_or_else(|| answer_labels.contains(&label));
            Some(NewOption {
                label,
                text: get_string(value, &["text", "content", "value", "内容", "选项内容"]),
                image_path: get_string(value, &["image_path", "imagePath", "image", "图片"]),
                is_correct,
            })
        }
        _ => None,
    }
}

fn answer_labels(answer: &str) -> Vec<String> {
    answer
        .split(|character: char| {
            character.is_whitespace() || matches!(character, ',' | '，' | ';' | '；' | '、')
        })
        .flat_map(|part| {
            let trimmed = part.trim();
            if trimmed.len() > 1
                && trimmed
                    .chars()
                    .all(|character| character.is_ascii_alphabetic())
            {
                trimmed
                    .chars()
                    .map(|character| character.to_ascii_uppercase().to_string())
                    .collect()
            } else if trimmed.is_empty() {
                Vec::new()
            } else {
                vec![normalize_option_label(trimmed)]
            }
        })
        .collect()
}

fn normalize_option_label(label: &str) -> String {
    label.trim().to_ascii_uppercase()
}

fn resolve_chapter_id(subject_id: &str, raw_chapter: &str) -> String {
    let normalized_raw = normalize_chapter_lookup(raw_chapter);

    all_chapters()
        .into_iter()
        .find(|chapter| {
            chapter.subject_id == subject_id
                && (chapter.id == raw_chapter
                    || normalize_chapter_lookup(chapter.name) == normalized_raw)
        })
        .map(|chapter| chapter.id.to_string())
        .unwrap_or_else(|| raw_chapter.to_string())
}

fn normalize_chapter_lookup(value: &str) -> String {
    value
        .split_whitespace()
        .collect::<String>()
        .replace("（不作要求）", "（不做要求）")
        .replace("(不作要求)", "（不做要求）")
        .replace("(不做要求)", "（不做要求）")
}
