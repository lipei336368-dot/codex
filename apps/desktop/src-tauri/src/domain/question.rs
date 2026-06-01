use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum QuestionType {
    SingleChoice,
    MultipleChoice,
    ShortAnswer,
    Essay,
}

impl QuestionType {
    pub fn as_str(&self) -> &'static str {
        match self {
            QuestionType::SingleChoice => "single_choice",
            QuestionType::MultipleChoice => "multiple_choice",
            QuestionType::ShortAnswer => "short_answer",
            QuestionType::Essay => "essay",
        }
    }

    pub fn from_str(value: &str) -> Option<Self> {
        match value {
            "single_choice" => Some(QuestionType::SingleChoice),
            "multiple_choice" => Some(QuestionType::MultipleChoice),
            "short_answer" => Some(QuestionType::ShortAnswer),
            "essay" => Some(QuestionType::Essay),
            _ => None,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct NewOption {
    pub label: String,
    pub text: Option<String>,
    pub image_path: Option<String>,
    pub is_correct: bool,
}

impl NewOption {
    pub fn text(label: &str, text: &str) -> Self {
        Self {
            label: label.to_string(),
            text: Some(text.to_string()),
            image_path: None,
            is_correct: label == "A",
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct NewQuestion {
    pub subject_id: String,
    pub chapter_id: String,
    pub question_type: QuestionType,
    pub stem: String,
    pub answer: Option<String>,
    pub analysis: Option<String>,
    pub options: Vec<NewOption>,
    pub stem_image_path: Option<String>,
    pub answer_image_path: Option<String>,
    pub analysis_image_path: Option<String>,
    pub source_school: Option<String>,
    pub source_year: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct UpdateQuestion {
    pub id: String,
    pub chapter_id: String,
    pub stem: String,
    pub answer: Option<String>,
    pub analysis: Option<String>,
    pub stem_image_path: Option<String>,
    pub answer_image_path: Option<String>,
    pub analysis_image_path: Option<String>,
    pub options: Vec<NewOption>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct Question {
    pub id: String,
    pub subject_id: String,
    pub chapter_id: String,
    pub question_type: QuestionType,
    pub stem: String,
    pub answer: Option<String>,
    pub analysis: Option<String>,
    pub stem_image_path: Option<String>,
    pub answer_image_path: Option<String>,
    pub analysis_image_path: Option<String>,
    pub options: Vec<NewOption>,
    pub source_school: Option<String>,
    pub source_year: Option<String>,
    pub drawn: bool,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct QuestionSearch {
    pub subject_id: String,
    pub chapter_id: Option<String>,
    pub question_type: Option<QuestionType>,
    pub query: Option<String>,
    pub include_drawn: bool,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct PagedQuestionSearch {
    pub subject_id: String,
    pub chapter_id: Option<String>,
    pub question_type: Option<QuestionType>,
    pub query: Option<String>,
    pub include_drawn: bool,
    pub offset: i64,
    pub limit: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct PagedQuestionResult {
    pub total: i64,
    pub items: Vec<Question>,
}
