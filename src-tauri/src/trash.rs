use std::path::Path;

#[tauri::command]
pub async fn move_multiple_to_trash(paths: Vec<String>) -> Result<Vec<String>, String> {
    let mut deleted: Vec<String> = Vec::new();
    let mut errors: Vec<String> = Vec::new();

    for p in &paths {
        let path = Path::new(p);
        if !path.exists() {
            continue;
        }
        match trash::delete(path) {
            Ok(()) => deleted.push(p.clone()),
            Err(e) => errors.push(format!("{}: {}", p, e)),
        }
    }

    if deleted.is_empty() && !errors.is_empty() {
        Err(errors.join("; "))
    } else {
        Ok(deleted)
    }
}
