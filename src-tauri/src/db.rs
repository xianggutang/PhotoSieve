use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub struct RatingRow {
    pub base_name: String,
    pub stars: Option<i32>,
    pub color: Option<i32>,
    pub is_rejected: bool,
}

fn open_db(folder: &str) -> Result<Connection, String> {
    let db_path = Path::new(folder).join(".culling_data.db");
    Connection::open(&db_path).map_err(|e| format!("无法打开数据库: {}", e))
}

#[tauri::command]
pub fn init_database(folder_path: String) -> Result<(), String> {
    let conn = open_db(&folder_path)?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS ratings (
            base_name TEXT PRIMARY KEY,
            stars INTEGER,
            color INTEGER,
            is_rejected INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )",
    )
    .map_err(|e| format!("建表失败: {}", e))
}

#[tauri::command]
pub fn save_ratings_batch(folder_path: String, rows: Vec<RatingRow>) -> Result<(), String> {
    let conn = open_db(&folder_path)?;
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    for row in &rows {
        tx.execute(
            "INSERT OR REPLACE INTO ratings (base_name, stars, color, is_rejected, updated_at)
             VALUES (?1, ?2, ?3, ?4, datetime('now'))",
            rusqlite::params![row.base_name, row.stars, row.color, row.is_rejected as i32],
        )
        .map_err(|e| format!("写入失败 {}: {}", row.base_name, e))?;
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn load_all_ratings(folder_path: String) -> Result<Vec<RatingRow>, String> {
    let conn = open_db(&folder_path)?;
    let mut stmt = conn
        .prepare("SELECT base_name, stars, color, is_rejected FROM ratings")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(RatingRow {
                base_name: row.get(0)?,
                stars: row.get(1)?,
                color: row.get(2)?,
                is_rejected: row.get::<_, i32>(3)? != 0,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}
