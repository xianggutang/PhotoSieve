mod scan;
mod exif;
mod trash;
mod export;
mod db;
mod histogram;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![scan::scan_directory, scan::resolve_scan_target, exif::get_exif_data, trash::move_multiple_to_trash, export::export_images, db::init_database, db::save_ratings_batch, db::load_all_ratings, histogram::get_histogram])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
