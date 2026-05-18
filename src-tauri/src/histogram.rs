use image::GenericImageView;
use jpeg_decoder::Decoder;
use serde::Serialize;
use std::io::BufReader;
use std::path::Path;

#[derive(Debug, Serialize)]
pub struct HistogramData {
    pub r: Vec<u32>,
    pub g: Vec<u32>,
    pub b: Vec<u32>,
    pub luma: Vec<u32>,
    pub max_count: u32,
}

#[tauri::command]
pub async fn get_histogram(file_path: String) -> Result<HistogramData, String> {
    let path = file_path.clone();
    tauri::async_runtime::spawn_blocking(move || {
        if !Path::new(&path).is_file() {
            return Err(format!("文件不存在: {}", path));
        }
        let is_jpg = path.to_lowercase().ends_with(".jpg")
            || path.to_lowercase().ends_with(".jpeg");

        if is_jpg {
            compute_histogram_jpeg(&path)
        } else {
            compute_histogram_image(&path)
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

fn compute_histogram_jpeg(path: &str) -> Result<HistogramData, String> {
    let file = std::fs::File::open(path).map_err(|e| format!("无法打开: {}", e))?;
    let mut decoder = Decoder::new(BufReader::new(file));
    let pixels = decoder.decode().map_err(|e| format!("JPEG 解码失败: {}", e))?;
    let info = decoder.info().ok_or("无法读取 JPEG 信息")?;
    let w = info.width as u64;
    let h = info.height as u64;
    let total = w * h;

    let step = if total > 8_000_000 { 8 }
        else if total > 2_000_000 { 4 }
        else if total > 500_000 { 2 }
        else { 1 };

    let mut r = vec![0u32; 256];
    let mut g = vec![0u32; 256];
    let mut b = vec![0u32; 256];
    let mut luma = vec![0u32; 256];

    let stride = w as usize * 3;
    for y in (0..h as usize).step_by(step) {
        let row_off = y * stride;
        for x in (0..w as usize).step_by(step) {
            let off = row_off + x * 3;
            let ri = pixels[off] as usize;
            let gi = pixels[off + 1] as usize;
            let bi = pixels[off + 2] as usize;
            r[ri] += 1;
            g[gi] += 1;
            b[bi] += 1;
            let li = (0.299 * ri as f64 + 0.587 * gi as f64 + 0.114 * bi as f64).round() as usize;
            luma[li.min(255)] += 1;
        }
    }

    let max_count = r.iter().chain(&g).chain(&b).chain(&luma).copied().max().unwrap_or(0);
    Ok(HistogramData { r, g, b, luma, max_count })
}

fn compute_histogram_image(path: &str) -> Result<HistogramData, String> {
    let img = image::open(path).map_err(|e| format!("解码失败: {}", e))?;
    let (w, h) = img.dimensions();
    let total = w as u64 * h as u64;

    let step = if total > 8_000_000 { 8 }
        else if total > 2_000_000 { 4 }
        else if total > 500_000 { 2 }
        else { 1 };

    let mut r = vec![0u32; 256];
    let mut g = vec![0u32; 256];
    let mut b = vec![0u32; 256];
    let mut luma = vec![0u32; 256];

    for y in (0..h).step_by(step) {
        for x in (0..w).step_by(step) {
            let px = img.get_pixel(x, y);
            let ri = px[0] as usize;
            let gi = px[1] as usize;
            let bi = px[2] as usize;
            r[ri] += 1;
            g[gi] += 1;
            b[bi] += 1;
            let li = (0.299f64 * ri as f64 + 0.587f64 * gi as f64 + 0.114f64 * bi as f64).round() as usize;
            luma[li.min(255)] += 1;
        }
    }

    let max_count = r.iter().chain(&g).chain(&b).chain(&luma).copied().max().unwrap_or(0);
    drop(img);
    Ok(HistogramData { r, g, b, luma, max_count })
}
