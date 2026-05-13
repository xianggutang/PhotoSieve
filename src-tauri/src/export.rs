use std::fs;
use std::path::Path;

const JPG_EXTS: &[&str] = &["jpg", "jpeg"];
const RAW_EXTS: &[&str] = &[
    "arw", "cr2", "cr3", "nef", "nrw", "raf", "rw2", "orf",
    "dng", "x3f", "pef", "3fr", "fff",
];

#[tauri::command]
pub async fn export_images(
    base_names: Vec<String>,
    source_dir: String,
    dest_dir: String,
    export_jpg: bool,
    export_raw: bool,
    is_move: bool,
) -> Result<(u32, Vec<String>), String> {
    let src = Path::new(&source_dir);
    let dst = Path::new(&dest_dir);

    if !dst.exists() {
        fs::create_dir_all(dst).map_err(|e| format!("无法创建目标目录: {}", e))?;
    }

    let mut count: u32 = 0;
    let mut errors: Vec<String> = Vec::new();

    for name in &base_names {
        if export_jpg {
            count += copy_files(name, src, dst, JPG_EXTS, is_move, &mut errors);
        }
        if export_raw {
            count += copy_files(name, src, dst, RAW_EXTS, is_move, &mut errors);
        }
        if export_jpg || export_raw {
            if let Some(found) = find_file(name, src, &["xmp"]) {
                let dest = dst.join(&found);
                if is_move {
                    if fs::rename(src.join(&found), &dest).is_err() {
                        let _ = fs::copy(src.join(&found), &dest);
                        let _ = fs::remove_file(src.join(&found));
                    }
                } else {
                    let _ = fs::copy(src.join(&found), &dest);
                }
            }
        }
    }

    if count == 0 && !errors.is_empty() {
        Err(errors.join("; "))
    } else {
        Ok((count, errors))
    }
}

fn find_file(name: &str, dir: &Path, exts: &[&str]) -> Option<String> {
    for ext in exts {
        let filename = format!("{}.{}", name, ext);
        let lower = dir.join(filename.to_lowercase());
        let upper = dir.join(filename.to_uppercase());
        if lower.exists() {
            return Some(filename.to_lowercase());
        }
        if upper.exists() {
            return Some(filename.to_uppercase());
        }
        let entries = fs::read_dir(dir).ok()?;
        for entry in entries.flatten() {
            let fname = entry.file_name().to_string_lossy().to_lowercase();
            if fname.starts_with(&name.to_lowercase()) && fname.ends_with(&format!(".{}", ext.to_lowercase())) {
                return Some(entry.file_name().to_string_lossy().to_string());
            }
        }
    }
    None
}

fn copy_files(name: &str, dir: &Path, dst: &Path, exts: &[&str], is_move: bool, errors: &mut Vec<String>) -> u32 {
    let Some(filename) = find_file(name, dir, exts) else {
        return 0;
    };
    let src_path = dir.join(&filename);
    let dest_path = dst.join(&filename);

    if is_move {
        match fs::rename(&src_path, &dest_path) {
            Ok(()) => return 1,
            Err(_) => {
                if let Err(e) = fs::copy(&src_path, &dest_path) {
                    errors.push(format!("复制失败 {}: {}", filename, e));
                    return 0;
                }
                let _ = fs::remove_file(&src_path);
            }
        }
    } else {
        if let Err(e) = fs::copy(&src_path, &dest_path) {
            errors.push(format!("复制失败 {}: {}", filename, e));
            return 0;
        }
    }
    1
}
