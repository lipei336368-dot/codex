pub const EXTRA_SCHEMA: &[&str] = &[
    "CREATE TABLE IF NOT EXISTS publish_batches (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      publish_date TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )",
    "CREATE TABLE IF NOT EXISTS publish_batch_items (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      item_order INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(batch_id) REFERENCES publish_batches(id),
      FOREIGN KEY(question_id) REFERENCES questions(id)
    )",
    "CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      name TEXT NOT NULL,
      config_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )",
    "CREATE TABLE IF NOT EXISTS import_jobs (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      status TEXT NOT NULL,
      report_json TEXT,
      created_at TEXT NOT NULL
    )",
    "CREATE TABLE IF NOT EXISTS export_jobs (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      export_type TEXT NOT NULL,
      status TEXT NOT NULL,
      output_path TEXT,
      created_at TEXT NOT NULL
    )",
];
