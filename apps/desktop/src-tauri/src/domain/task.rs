#[derive(Clone, Debug, serde::Serialize, serde::Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TaskKind {
    ImportJson,
    Dedupe,
    ExportJson,
    ExportWord,
    ExportImages,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TaskStatus {
    Queued,
    Running,
    Succeeded,
    Failed,
    Cancelled,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct TaskProgress {
    pub id: String,
    pub kind: TaskKind,
    pub status: TaskStatus,
    pub title: String,
    pub current: usize,
    pub total: usize,
    pub message: String,
    pub created_at: String,
    pub updated_at: String,
    pub error: Option<String>,
}
