use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ImageGroup {
    pub base_name: String,
    pub jpg_path: Option<String>,
    pub raw_path: Option<String>,
    pub size: u64,
    pub timestamp: u64,
}

const JPG_EXTS: &[&str] = &["jpg", "jpeg"];
const RAW_EXTS: &[&str] = &["cr2", "cr3", "nef", "arw", "dng"];

struct Builder {
    base_name: String,
    jpg_path: Option<String>,
    raw_path: Option<String>,
    size: u64,
    timestamp: u64,
}

impl From<Builder> for ImageGroup {
    fn from(b: Builder) -> Self {
        ImageGroup {
            base_name: b.base_name,
            jpg_path: b.jpg_path,
            raw_path: b.raw_path,
            size: b.size,
            timestamp: b.timestamp,
        }
    }
}

#[tauri::command]
pub fn scan_directory(path: String) -> Result<Vec<ImageGroup>, String> {
    let dir = Path::new(&path);
    if !dir.is_dir() {
        return Err(format!("不是有效的目录: {}", path));
    }

    let mut groups: HashMap<String, Builder> = HashMap::new();
    let entries = fs::read_dir(dir).map_err(|e| e.to_string())?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_path = entry.path();

        if !file_path.is_file() {
            continue;
        }

        let ext = file_path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase())
            .unwrap_or_default();

        if !JPG_EXTS.contains(&ext.as_str()) && !RAW_EXTS.contains(&ext.as_str()) {
            continue;
        }

        let base_name = file_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_string();

        if base_name.is_empty() {
            continue;
        }

        let path_str = file_path.to_string_lossy().to_string();

        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        let size = metadata.len();
        let timestamp = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0);

        let group = groups.entry(base_name.clone()).or_insert_with(|| Builder {
            base_name: base_name.clone(),
            jpg_path: None,
            raw_path: None,
            size: 0,
            timestamp: 0,
        });

        group.size += size;
        group.timestamp = group.timestamp.max(timestamp);

        if JPG_EXTS.contains(&ext.as_str()) {
            group.jpg_path = Some(path_str);
        } else {
            group.raw_path = Some(path_str);
        }
    }

    let mut result: Vec<ImageGroup> = groups.into_values().map(ImageGroup::from).collect();
    result.sort_by(|a, b| natural_cmp(&a.base_name, &b.base_name));
    Ok(result)
}

#[tauri::command]
pub fn resolve_scan_target(paths: Vec<String>) -> Result<String, String> {
    for path in &paths {
        let p = Path::new(path);
        if p.is_dir() {
            return Ok(path.clone());
        }
    }
    for path in &paths {
        let p = Path::new(path);
        if let Some(parent) = p.parent() {
            return Ok(parent.to_string_lossy().to_string());
        }
    }
    Err("无法解析有效的目录路径".to_string())
}

fn natural_cmp(a: &str, b: &str) -> std::cmp::Ordering {
    let a_bytes: &[u8] = a.as_bytes();
    let b_bytes: &[u8] = b.as_bytes();
    let mut ai = 0;
    let mut bi = 0;

    let is_digit = |b: u8| b.is_ascii_digit();

    while ai < a_bytes.len() && bi < b_bytes.len() {
        if is_digit(a_bytes[ai]) && is_digit(b_bytes[bi]) {
            let a_start = ai;
            let b_start = bi;
            while ai < a_bytes.len() && is_digit(a_bytes[ai]) {
                ai += 1;
            }
            while bi < b_bytes.len() && is_digit(b_bytes[bi]) {
                bi += 1;
            }
            let a_num: u64 = std::str::from_utf8(&a_bytes[a_start..ai])
                .unwrap_or("0")
                .parse()
                .unwrap_or(0);
            let b_num: u64 = std::str::from_utf8(&b_bytes[b_start..bi])
                .unwrap_or("0")
                .parse()
                .unwrap_or(0);
            let cmp = a_num.cmp(&b_num);
            if cmp != std::cmp::Ordering::Equal {
                return cmp;
            }
        } else {
            let ac = a_bytes[ai].to_ascii_lowercase();
            let bc = b_bytes[bi].to_ascii_lowercase();
            let cmp = ac.cmp(&bc);
            if cmp != std::cmp::Ordering::Equal {
                return cmp;
            }
            ai += 1;
            bi += 1;
        }
    }

    a.len().cmp(&b.len())
}
