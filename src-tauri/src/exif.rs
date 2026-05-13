use std::fs;
use std::io::BufReader;
use std::path::Path;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ExifData {
    pub date_time: Option<String>,
    pub camera_model: Option<String>,
    pub aperture: Option<String>,
    pub shutter_speed: Option<String>,
    pub iso: Option<String>,
    pub focal_length: Option<String>,
}

#[tauri::command]
pub fn get_exif_data(file_path: String) -> Result<ExifData, String> {
    let path = Path::new(&file_path);
    if !path.is_file() {
        return Err(format!("文件不存在: {}", file_path));
    }

    let file = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut reader = BufReader::new(file);
    let exif = exif::Reader::new()
        .read_from_container(&mut reader)
        .map_err(|e| format!("EXIF 解析失败: {}", e))?;

    Ok(ExifData {
        date_time: read_tag(&exif, exif::Tag::DateTimeOriginal),
        camera_model: read_tag(&exif, exif::Tag::Model),
        aperture: read_fnumber(&exif),
        shutter_speed: read_exposure_time(&exif),
        iso: read_iso(&exif),
        focal_length: read_focal_length(&exif),
    })
}

fn read_tag(exif: &exif::Exif, tag: exif::Tag) -> Option<String> {
    exif.get_field(tag, exif::In::PRIMARY)
        .map(|f| f.display_value().to_string())
}

fn value_as_float(value: &exif::Value, index: usize) -> Option<f64> {
    match value {
        exif::Value::Rational(v) => v.get(index).map(|r| r.num as f64 / r.denom as f64),
        _ => None,
    }
}

fn value_as_uint(value: &exif::Value, index: usize) -> Option<u32> {
    match value {
        exif::Value::Short(v) => v.get(index).map(|&n| n as u32),
        exif::Value::Long(v) => v.get(index).map(|&n| n),
        _ => None,
    }
}

fn read_fnumber(exif: &exif::Exif) -> Option<String> {
    let field = exif.get_field(exif::Tag::FNumber, exif::In::PRIMARY)?;
    value_as_float(&field.value, 0).map(|v| format!("f/{:.1}", v))
}

fn read_exposure_time(exif: &exif::Exif) -> Option<String> {
    let field = exif.get_field(exif::Tag::ExposureTime, exif::In::PRIMARY)?;
    value_as_float(&field.value, 0).map(|v| {
        if v < 1.0 {
            format!("1/{}", (1.0 / v).round() as u32)
        } else {
            format!("{:.1}s", v)
        }
    })
}

fn read_iso(exif: &exif::Exif) -> Option<String> {
    let field = exif.get_field(exif::Tag::ISOSpeed, exif::In::PRIMARY)?;
    value_as_uint(&field.value, 0).map(|v| format!("ISO {}", v))
}

fn read_focal_length(exif: &exif::Exif) -> Option<String> {
    let field = exif.get_field(exif::Tag::FocalLength, exif::In::PRIMARY)?;
    value_as_float(&field.value, 0).map(|v| format!("{}mm", v.round() as u32))
}
