use std::collections::HashMap;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{params, params_from_iter, Connection, OptionalExtension, Result};

use crate::domain::chapter::all_chapters;
use crate::domain::question::{
    NewOption, NewQuestion, PagedQuestionResult, PagedQuestionSearch, Question, QuestionSearch,
    QuestionType, UpdateQuestion,
};
use crate::domain::subject::SUBJECTS;

pub struct Database {
    connection: Connection,
}

impl Database {
    pub fn open(path: impl AsRef<Path>) -> Result<Self> {
        let connection = Connection::open(path)?;
        connection.pragma_update(None, "foreign_keys", "ON")?;
        Ok(Self { connection })
    }

    pub fn migrate(&self) -> Result<()> {
        self.connection.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS subjects (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              theme_key TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS chapters (
              id TEXT PRIMARY KEY,
              subject_id TEXT NOT NULL,
              chapter_order INTEGER NOT NULL,
              name TEXT NOT NULL,
              no_requirement INTEGER NOT NULL DEFAULT 0,
              FOREIGN KEY(subject_id) REFERENCES subjects(id)
            );

            CREATE TABLE IF NOT EXISTS questions (
              id TEXT PRIMARY KEY,
              subject_id TEXT NOT NULL,
              chapter_id TEXT NOT NULL,
              type TEXT NOT NULL,
              stem TEXT NOT NULL,
              answer TEXT,
              analysis TEXT,
              source_school TEXT,
              source_year TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              deleted_at TEXT,
              FOREIGN KEY(subject_id) REFERENCES subjects(id),
              FOREIGN KEY(chapter_id) REFERENCES chapters(id)
            );

            CREATE TABLE IF NOT EXISTS question_options (
              id TEXT PRIMARY KEY,
              question_id TEXT NOT NULL,
              option_order INTEGER NOT NULL,
              label TEXT NOT NULL,
              text TEXT,
              image_path TEXT,
              is_correct INTEGER NOT NULL DEFAULT 0,
              FOREIGN KEY(question_id) REFERENCES questions(id)
            );

            CREATE TABLE IF NOT EXISTS draw_history (
              id TEXT PRIMARY KEY,
              subject_id TEXT NOT NULL,
              question_id TEXT NOT NULL,
              publish_date TEXT NOT NULL,
              batch_id TEXT,
              created_at TEXT NOT NULL,
              FOREIGN KEY(subject_id) REFERENCES subjects(id),
              FOREIGN KEY(question_id) REFERENCES questions(id)
            );

            CREATE INDEX IF NOT EXISTS idx_questions_subject_type
              ON questions(subject_id, type);
            CREATE INDEX IF NOT EXISTS idx_questions_subject_chapter
              ON questions(subject_id, chapter_id);
            CREATE INDEX IF NOT EXISTS idx_questions_deleted
              ON questions(deleted_at);
            CREATE INDEX IF NOT EXISTS idx_draw_history_subject_question
              ON draw_history(subject_id, question_id);
            ",
        )?;

        self.add_column_if_missing("questions", "stem_image_path", "TEXT")?;
        self.add_column_if_missing("questions", "answer_image_path", "TEXT")?;
        self.add_column_if_missing("questions", "analysis_image_path", "TEXT")?;
        for statement in crate::storage::migrations::EXTRA_SCHEMA {
            self.connection.execute(statement, [])?;
        }
        self.seed_subjects()?;
        self.seed_chapters()?;
        Ok(())
    }

    pub fn table_names(&self) -> Result<Vec<String>> {
        let mut statement = self
            .connection
            .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name ASC")?;
        let names = statement
            .query_map([], |row| row.get::<_, String>(0))?
            .collect::<Result<Vec<_>>>()?;
        Ok(names)
    }

    pub fn create_question(&self, question: NewQuestion) -> Result<String> {
        let id = make_id("question");
        let now = current_timestamp();

        self.connection.execute(
            "
            INSERT INTO questions (
              id, subject_id, chapter_id, type, stem, answer, analysis,
              stem_image_path, answer_image_path, analysis_image_path,
              source_school, source_year, created_at, updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13)
            ",
            params![
                id,
                question.subject_id,
                question.chapter_id,
                question.question_type.as_str(),
                question.stem,
                question.answer,
                question.analysis,
                question.stem_image_path,
                question.answer_image_path,
                question.analysis_image_path,
                question.source_school,
                question.source_year,
                now
            ],
        )?;

        for (index, option) in question.options.iter().enumerate() {
            self.connection.execute(
                "
                INSERT INTO question_options (
                  id, question_id, option_order, label, text, image_path, is_correct
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                ",
                params![
                    make_id("option"),
                    id,
                    index as i32,
                    option.label,
                    option.text,
                    option.image_path,
                    if option.is_correct { 1 } else { 0 }
                ],
            )?;
        }

        Ok(id)
    }

    pub fn search_questions(&self, search: QuestionSearch) -> Result<Vec<Question>> {
        let mut statement = self.connection.prepare(
            "
            SELECT
              q.id, q.subject_id, q.chapter_id, q.type, q.stem, q.answer,
              q.analysis, q.stem_image_path, q.answer_image_path, q.analysis_image_path,
              q.source_school, q.source_year,
              EXISTS(
                SELECT 1 FROM draw_history dh
                WHERE dh.subject_id = q.subject_id AND dh.question_id = q.id
              ) AS drawn
            FROM questions q
            WHERE q.deleted_at IS NULL
              AND q.subject_id = ?1
              AND (?2 IS NULL OR q.chapter_id = ?2)
              AND (
                ?3 IS NULL
                OR q.type = ?3
                OR (?3 = 'short_answer' AND q.type = 'essay')
              )
              AND (?4 IS NULL OR q.stem LIKE '%' || ?4 || '%')
              AND (?5 = 1 OR NOT EXISTS(
                SELECT 1 FROM draw_history dh
                WHERE dh.subject_id = q.subject_id AND dh.question_id = q.id
              ))
            ORDER BY
              drawn ASC,
              CASE q.type
                WHEN 'single_choice' THEN 1
                WHEN 'multiple_choice' THEN 2
                WHEN 'short_answer' THEN 3
                WHEN 'essay' THEN 3
                ELSE 99
              END ASC,
              q.created_at ASC,
              q.id ASC
            ",
        )?;

        let question_type = search
            .question_type
            .as_ref()
            .map(QuestionType::as_str)
            .map(str::to_string);
        let include_drawn = if search.include_drawn { 1 } else { 0 };

        let mut questions = statement
            .query_map(
                params![
                    search.subject_id,
                    search.chapter_id,
                    question_type,
                    search.query,
                    include_drawn
                ],
                |row| {
                    let raw_type: String = row.get(3)?;
                    Ok(Question {
                        id: row.get(0)?,
                        subject_id: row.get(1)?,
                        chapter_id: row.get(2)?,
                        question_type: QuestionType::from_str(&raw_type)
                            .unwrap_or(QuestionType::SingleChoice),
                        stem: row.get(4)?,
                        answer: row.get(5)?,
                        analysis: row.get(6)?,
                        stem_image_path: row.get(7)?,
                        answer_image_path: row.get(8)?,
                        analysis_image_path: row.get(9)?,
                        options: Vec::new(),
                        source_school: row.get(10)?,
                        source_year: row.get(11)?,
                        drawn: row.get::<_, i32>(12)? == 1,
                    })
                },
            )?
            .collect::<Result<Vec<_>>>()?;

        let question_ids = questions
            .iter()
            .map(|question| question.id.clone())
            .collect::<Vec<_>>();
        let mut options_by_question = self.question_options_for_questions(&question_ids)?;

        for question in &mut questions {
            question.options = options_by_question.remove(&question.id).unwrap_or_default();
        }

        Ok(questions)
    }

    fn question_options_for_questions(
        &self,
        question_ids: &[String],
    ) -> Result<HashMap<String, Vec<NewOption>>> {
        let mut options_by_question: HashMap<String, Vec<NewOption>> = HashMap::new();
        if question_ids.is_empty() {
            return Ok(options_by_question);
        }

        for chunk in question_ids.chunks(500) {
            let placeholders = vec!["?"; chunk.len()].join(", ");
            let query = format!(
                "
                SELECT question_id, label, text, image_path, is_correct
                FROM question_options
                WHERE question_id IN ({placeholders})
                ORDER BY question_id ASC, option_order ASC
                "
            );
            let mut statement = self.connection.prepare(&query)?;
            let rows = statement.query_map(
                params_from_iter(chunk.iter().map(String::as_str)),
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        NewOption {
                            label: row.get(1)?,
                            text: row.get(2)?,
                            image_path: row.get(3)?,
                            is_correct: row.get::<_, i32>(4)? == 1,
                        },
                    ))
                },
            )?;

            for row in rows {
                let (question_id, option) = row?;
                options_by_question
                    .entry(question_id)
                    .or_default()
                    .push(option);
            }
        }

        Ok(options_by_question)
    }

    pub fn question_options(&self, question_id: &str) -> Result<Vec<NewOption>> {
        let mut statement = self.connection.prepare(
            "
            SELECT label, text, image_path, is_correct
            FROM question_options
            WHERE question_id = ?1
            ORDER BY option_order ASC
            ",
        )?;

        let options = statement
            .query_map(params![question_id], |row| {
                Ok(NewOption {
                    label: row.get(0)?,
                    text: row.get(1)?,
                    image_path: row.get(2)?,
                    is_correct: row.get::<_, i32>(3)? == 1,
                })
            })?
            .collect();

        options
    }

    pub fn search_questions_paged(
        &self,
        search: PagedQuestionSearch,
    ) -> Result<PagedQuestionResult> {
        let subject_id = search.subject_id;
        let chapter_id = search.chapter_id;
        let question_type = search
            .question_type
            .as_ref()
            .map(QuestionType::as_str)
            .map(str::to_string);
        let query = search.query;
        let include_drawn = if search.include_drawn { 1 } else { 0 };
        let offset = search.offset.max(0);
        let limit = search.limit.clamp(1, 200);

        let total = self.connection.query_row(
            "
            SELECT COUNT(*)
            FROM questions q
            WHERE q.deleted_at IS NULL
              AND q.subject_id = ?1
              AND (?2 IS NULL OR q.chapter_id = ?2)
              AND (
                ?3 IS NULL
                OR q.type = ?3
                OR (?3 = 'short_answer' AND q.type = 'essay')
              )
              AND (?4 IS NULL OR q.stem LIKE '%' || ?4 || '%')
              AND (?5 = 1 OR NOT EXISTS(
                SELECT 1 FROM draw_history dh
                WHERE dh.subject_id = q.subject_id AND dh.question_id = q.id
              ))
            ",
            params![
                subject_id.as_str(),
                chapter_id.as_deref(),
                question_type.as_deref(),
                query.as_deref(),
                include_drawn
            ],
            |row| row.get(0),
        )?;

        let mut statement = self.connection.prepare(
            "
            SELECT
              q.id, q.subject_id, q.chapter_id, q.type, q.stem, q.answer,
              q.analysis, q.stem_image_path, q.answer_image_path, q.analysis_image_path,
              q.source_school, q.source_year,
              EXISTS(
                SELECT 1 FROM draw_history dh
                WHERE dh.subject_id = q.subject_id AND dh.question_id = q.id
              ) AS drawn
            FROM questions q
            WHERE q.deleted_at IS NULL
              AND q.subject_id = ?1
              AND (?2 IS NULL OR q.chapter_id = ?2)
              AND (
                ?3 IS NULL
                OR q.type = ?3
                OR (?3 = 'short_answer' AND q.type = 'essay')
              )
              AND (?4 IS NULL OR q.stem LIKE '%' || ?4 || '%')
              AND (?5 = 1 OR NOT EXISTS(
                SELECT 1 FROM draw_history dh
                WHERE dh.subject_id = q.subject_id AND dh.question_id = q.id
              ))
            ORDER BY
              drawn ASC,
              CASE q.type
                WHEN 'single_choice' THEN 1
                WHEN 'multiple_choice' THEN 2
                WHEN 'short_answer' THEN 3
                WHEN 'essay' THEN 3
                ELSE 99
              END ASC,
              q.created_at ASC,
              q.id ASC
            LIMIT ?6 OFFSET ?7
            ",
        )?;

        let mut items = statement
            .query_map(
                params![
                    subject_id.as_str(),
                    chapter_id.as_deref(),
                    question_type.as_deref(),
                    query.as_deref(),
                    include_drawn,
                    limit,
                    offset
                ],
                |row| {
                    let raw_type: String = row.get(3)?;
                    Ok(Question {
                        id: row.get(0)?,
                        subject_id: row.get(1)?,
                        chapter_id: row.get(2)?,
                        question_type: QuestionType::from_str(&raw_type)
                            .unwrap_or(QuestionType::SingleChoice),
                        stem: row.get(4)?,
                        answer: row.get(5)?,
                        analysis: row.get(6)?,
                        stem_image_path: row.get(7)?,
                        answer_image_path: row.get(8)?,
                        analysis_image_path: row.get(9)?,
                        options: Vec::new(),
                        source_school: row.get(10)?,
                        source_year: row.get(11)?,
                        drawn: row.get::<_, i32>(12)? == 1,
                    })
                },
            )?
            .collect::<Result<Vec<_>>>()?;

        let question_ids = items
            .iter()
            .map(|question| question.id.clone())
            .collect::<Vec<_>>();
        let mut options_by_question = self.question_options_for_questions(&question_ids)?;

        for question in &mut items {
            question.options = options_by_question.remove(&question.id).unwrap_or_default();
        }

        Ok(PagedQuestionResult { total, items })
    }

    pub fn question_count(&self, subject_id: &str) -> Result<i64> {
        self.connection.query_row(
            "SELECT COUNT(*) FROM questions WHERE subject_id = ?1 AND deleted_at IS NULL",
            params![subject_id],
            |row| row.get(0),
        )
    }

    pub fn question_type_counts(&self, subject_id: &str) -> Result<Vec<(QuestionType, i64, i64)>> {
        let mut statement = self.connection.prepare(
            "
            SELECT
              q.type,
              COUNT(*) AS total,
              SUM(CASE WHEN EXISTS(
                SELECT 1 FROM draw_history dh
                WHERE dh.subject_id = q.subject_id AND dh.question_id = q.id
              ) THEN 0 ELSE 1 END) AS available
            FROM questions q
            WHERE q.deleted_at IS NULL
              AND q.subject_id = ?1
            GROUP BY q.type
            ",
        )?;

        let counts = statement
            .query_map(params![subject_id], |row| {
                let raw_type: String = row.get(0)?;
                Ok((
                    QuestionType::from_str(&raw_type).unwrap_or(QuestionType::SingleChoice),
                    row.get(1)?,
                    row.get(2)?,
                ))
            })?
            .collect();

        counts
    }

    pub fn update_question(&self, question: UpdateQuestion) -> Result<()> {
        self.connection.execute(
            "
            UPDATE questions
            SET stem = ?1,
                answer = ?2,
                analysis = ?3,
                stem_image_path = ?4,
                answer_image_path = ?5,
                analysis_image_path = ?6,
                chapter_id = ?7,
                updated_at = ?8
            WHERE id = ?9 AND deleted_at IS NULL
            ",
            params![
                question.stem,
                question.answer,
                question.analysis,
                question.stem_image_path,
                question.answer_image_path,
                question.analysis_image_path,
                question.chapter_id,
                current_timestamp(),
                &question.id
            ],
        )?;

        self.connection.execute(
            "DELETE FROM question_options WHERE question_id = ?1",
            params![&question.id],
        )?;

        for (index, option) in question.options.iter().enumerate() {
            self.connection.execute(
                "
                INSERT INTO question_options (
                  id, question_id, option_order, label, text, image_path, is_correct
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                ",
                params![
                    make_id("option"),
                    &question.id,
                    index as i32,
                    &option.label,
                    &option.text,
                    &option.image_path,
                    if option.is_correct { 1 } else { 0 }
                ],
            )?;
        }

        Ok(())
    }

    pub fn delete_questions(&self, question_ids: &[String]) -> Result<()> {
        let now = current_timestamp();

        for question_id in question_ids {
            self.connection.execute(
                "
                UPDATE questions
                SET deleted_at = ?1, updated_at = ?1
                WHERE id = ?2 AND deleted_at IS NULL
                ",
                params![now, question_id],
            )?;
        }

        Ok(())
    }

    pub fn mark_drawn(
        &self,
        subject_id: &str,
        question_id: &str,
        publish_date: &str,
        batch_id: Option<&str>,
    ) -> Result<()> {
        self.connection.execute(
            "
            INSERT INTO draw_history (
              id, subject_id, question_id, publish_date, batch_id, created_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            ",
            params![
                make_id("draw"),
                subject_id,
                question_id,
                publish_date,
                batch_id,
                current_timestamp()
            ],
        )?;

        Ok(())
    }

    pub fn reset_drawn(&self, subject_id: &str, question_ids: &[String]) -> Result<()> {
        for question_id in question_ids {
            self.connection.execute(
                "
                DELETE FROM draw_history
                WHERE subject_id = ?1 AND question_id = ?2
                ",
                params![subject_id, question_id],
            )?;
        }

        Ok(())
    }

    pub fn generated_dates(&self, subject_id: &str) -> Result<Vec<String>> {
        let mut statement = self.connection.prepare(
            "
            SELECT DISTINCT publish_date
            FROM draw_history
            WHERE subject_id = ?1
            ORDER BY publish_date ASC
            ",
        )?;

        let dates = statement
            .query_map(params![subject_id], |row| row.get::<_, String>(0))?
            .collect();
        dates
    }

    pub fn reset_generated_dates(&self, subject_id: &str, publish_dates: &[String]) -> Result<()> {
        for publish_date in publish_dates {
            self.connection.execute(
                "
                DELETE FROM draw_history
                WHERE subject_id = ?1 AND publish_date = ?2
                ",
                params![subject_id, publish_date],
            )?;
        }

        Ok(())
    }

    fn seed_subjects(&self) -> Result<()> {
        for subject in SUBJECTS {
            self.connection.execute(
                "
                INSERT INTO subjects (id, name, theme_key)
                VALUES (?1, ?2, ?3)
                ON CONFLICT(id) DO UPDATE SET
                  name = excluded.name,
                  theme_key = excluded.theme_key
                ",
                params![subject.id, subject.name, subject.theme_key],
            )?;
        }
        Ok(())
    }

    fn add_column_if_missing(&self, table: &str, column: &str, definition: &str) -> Result<()> {
        let mut statement = self
            .connection
            .prepare(&format!("PRAGMA table_info({table})"))?;
        let columns = statement
            .query_map([], |row| row.get::<_, String>(1))?
            .collect::<Result<Vec<_>>>()?;

        if !columns.iter().any(|existing| existing == column) {
            self.connection.execute(
                &format!("ALTER TABLE {table} ADD COLUMN {column} {definition}"),
                [],
            )?;
        }

        Ok(())
    }

    fn seed_chapters(&self) -> Result<()> {
        for chapter in all_chapters() {
            let subject_exists: Option<String> = self
                .connection
                .query_row(
                    "SELECT id FROM subjects WHERE id = ?1",
                    params![chapter.subject_id],
                    |row| row.get(0),
                )
                .optional()?;

            if subject_exists.is_some() {
                self.connection.execute(
                    "
                    INSERT INTO chapters (
                      id, subject_id, chapter_order, name, no_requirement
                    )
                    VALUES (?1, ?2, ?3, ?4, ?5)
                    ON CONFLICT(id) DO UPDATE SET
                      subject_id = excluded.subject_id,
                      chapter_order = excluded.chapter_order,
                      name = excluded.name,
                      no_requirement = excluded.no_requirement
                    ",
                    params![
                        chapter.id,
                        chapter.subject_id,
                        chapter.order,
                        chapter.name,
                        if chapter.no_requirement { 1 } else { 0 }
                    ],
                )?;
            }
        }
        Ok(())
    }
}

fn current_timestamp() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock should be valid")
        .as_secs()
        .to_string()
}

fn make_id(prefix: &str) -> String {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock should be valid")
        .as_nanos();
    format!("{prefix}_{nonce}")
}
