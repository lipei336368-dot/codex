use std::path::{Path, PathBuf};
use std::sync::Mutex;

use rusqlite::Result;
use serde::{Deserialize, Serialize};

use crate::storage::database::Database;

pub const DATABASE_FILE_NAME: &str = "yiyan-daily-question-generator.sqlite";

#[derive(Debug, Default, Deserialize, Serialize)]
struct AppConfig {
    data_dir: Option<String>,
}

pub struct AppState {
    database: Mutex<Database>,
    data_dir: PathBuf,
    database_path: PathBuf,
    config_dir: PathBuf,
}

impl AppState {
    pub fn open(path: impl AsRef<Path>) -> Result<Self> {
        Self::open_with_config_dir(path, PathBuf::new())
    }

    pub fn open_with_config_dir(path: impl AsRef<Path>, config_dir: impl AsRef<Path>) -> Result<Self> {
        let path = path.as_ref();
        let database = Database::open(path)?;
        database.migrate()?;
        let data_dir = path
            .parent()
            .unwrap_or_else(|| Path::new("."))
            .to_path_buf();
        Ok(Self {
            database: Mutex::new(database),
            data_dir,
            database_path: path.to_path_buf(),
            config_dir: config_dir.as_ref().to_path_buf(),
        })
    }

    pub fn with_database<T>(&self, operation: impl FnOnce(&Database) -> Result<T>) -> Result<T> {
        let database = self
            .database
            .lock()
            .expect("database mutex should not be poisoned");
        operation(&database)
    }

    pub fn data_dir(&self) -> PathBuf {
        self.data_dir.clone()
    }

    pub fn database_path(&self) -> PathBuf {
        self.database_path.clone()
    }

    pub fn config_dir(&self) -> PathBuf {
        self.config_dir.clone()
    }
}

pub fn resolve_data_dir(config_dir: &Path, default_data_dir: &Path) -> PathBuf {
    let config = read_config(config_dir);
    config
        .data_dir
        .filter(|value| !value.trim().is_empty())
        .map(PathBuf::from)
        .unwrap_or_else(|| default_data_dir.to_path_buf())
}

pub fn write_data_dir_config(config_dir: &Path, data_dir: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(config_dir)?;
    let config = AppConfig {
        data_dir: Some(data_dir.to_string_lossy().to_string()),
    };
    let json = serde_json::to_string_pretty(&config)?;
    std::fs::write(config_dir.join("settings.json"), json)
}

fn read_config(config_dir: &Path) -> AppConfig {
    let path = config_dir.join("settings.json");
    let Ok(content) = std::fs::read_to_string(path) else {
        return AppConfig::default();
    };
    serde_json::from_str(&content).unwrap_or_default()
}
