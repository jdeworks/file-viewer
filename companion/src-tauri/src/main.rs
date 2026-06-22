// File Viewer Companion — desktop tray wrapper.
//
// A windowless (tray-only) Tauri app that runs the companion HTTP server (the same Axum router the
// standalone binary uses, via file_viewer_companion::router) in-process on 127.0.0.1:7700, and adds
// the things a browser page can't do for itself: a tray menu, a NATIVE folder picker for adding
// watched folders, and login-item autostart. The viewer talks to it over HTTP exactly as it does
// with the standalone server.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use file_viewer_companion::{
    config::{config_path, load_config, save_config},
    router,
    watcher::FileWatcher,
    AppState,
};
use std::sync::{Arc, Mutex};
use tauri::{
    image::Image,
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    Manager,
};
use tauri_plugin_dialog::DialogExt;

const PORT: u16 = 7700;
const VIEWER_URL: &str = "https://jdeworks.github.io/file-viewer/";
const PAGES_ORIGIN: &str = "https://jdeworks.github.io";

// Keeps the file watcher alive for the whole app lifetime (dropping it stops fs events).
struct WatcherGuard(#[allow(dead_code)] Option<FileWatcher>);

fn spawn_server(state: AppState) {
    std::thread::spawn(move || {
        let rt = tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build()
            .expect("tokio runtime");
        rt.block_on(async move {
            let app = router(state, PAGES_ORIGIN.to_string());
            match tokio::net::TcpListener::bind(("127.0.0.1", PORT)).await {
                Ok(listener) => {
                    let _ = axum::serve(listener, app).await;
                }
                Err(e) => eprintln!("companion: cannot bind 127.0.0.1:{PORT}: {e}"),
            }
        });
    });
}

fn open_url(url: &str) {
    #[cfg(target_os = "linux")]
    let _ = std::process::Command::new("xdg-open").arg(url).spawn();
    #[cfg(target_os = "macos")]
    let _ = std::process::Command::new("open").arg(url).spawn();
    #[cfg(target_os = "windows")]
    let _ = std::process::Command::new("cmd").args(["/C", "start", "", url]).spawn();
}

fn main() {
    let token =
        std::env::var("COMPANION_TOKEN").unwrap_or_else(|_| uuid::Uuid::new_v4().to_string());
    let watched_paths = Arc::new(Mutex::new(load_config()));

    let (watcher_tx, watcher) = match FileWatcher::new(Arc::clone(&watched_paths)) {
        Ok(fw) => {
            let tx = fw.tx.clone();
            (tx, Some(fw))
        }
        Err(e) => {
            eprintln!("companion: file watcher unavailable: {e}");
            let (tx, _) = tokio::sync::broadcast::channel(1);
            (tx, None)
        }
    };

    let state = AppState {
        token: token.clone(),
        watched_paths: Arc::clone(&watched_paths),
        debug: false,
        watcher_tx,
    };
    spawn_server(state);

    // Make the session token discoverable without a console: write it next to the config file.
    // (The viewer's Companion settings panel takes the token; mutating calls require it.)
    let token_file = config_path().with_file_name("token");
    if let Some(parent) = token_file.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let _ = std::fs::write(&token_file, &token);
    println!("File Viewer Companion (desktop) — server on 127.0.0.1:{PORT}");
    println!("  token: {token}  (also written to {})", token_file.display());

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .setup(move |app| {
            app.manage(WatcherGuard(watcher));

            let status = MenuItemBuilder::with_id("status", format!("Running on 127.0.0.1:{PORT}"))
                .enabled(false)
                .build(app)?;
            let open = MenuItemBuilder::with_id("open", "Open File Viewer").build(app)?;
            let addpath = MenuItemBuilder::with_id("addpath", "Add watched folder…").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let menu = MenuBuilder::new(app)
                .items(&[&status, &open, &addpath, &quit])
                .build()?;

            let wp = Arc::clone(&watched_paths);
            let icon = Image::from_bytes(include_bytes!("../icons/32x32.png"))?;
            TrayIconBuilder::with_id("main")
                .icon(icon)
                .tooltip("File Viewer Companion")
                .menu(&menu)
                .on_menu_event(move |app, event| match event.id().as_ref() {
                    "open" => open_url(VIEWER_URL),
                    "addpath" => {
                        let wp2 = Arc::clone(&wp);
                        app.dialog().file().pick_folder(move |folder| {
                            let Some(fp) = folder else { return };
                            let Some(p) = fp.as_path() else { return };
                            let pb = p.to_path_buf();
                            if !pb.is_dir() {
                                return;
                            }
                            let paths = {
                                let mut locked = wp2.lock().unwrap();
                                if !locked.contains(&pb) {
                                    locked.push(pb);
                                }
                                locked.clone()
                            };
                            let _ = save_config(&paths);
                        });
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error building tauri application")
        .run(|_app, event| {
            // Tray-only app: closing the (nonexistent) last window must not quit.
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                api.prevent_exit();
            }
        });
}
