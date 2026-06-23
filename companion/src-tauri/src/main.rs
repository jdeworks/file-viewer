// File Viewer Companion — desktop tray wrapper.
//
// A windowless (tray-only) Tauri app that runs the companion HTTP server (the same Axum router the
// standalone binary uses, via file_viewer_companion::router_with) in-process on 127.0.0.1:7700, and
// adds the things a browser page can't do for itself: a tray menu, a NATIVE folder picker (both
// from the tray AND browser-initiated via POST /path-picker), and login-item autostart. The viewer
// talks to it over HTTP exactly as it does with the standalone server.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use axum::{extract::State, middleware, routing::post, Json, Router};
use file_viewer_companion::{
    auth::require_token,
    config::{config_path, load_config, save_config},
    logging, router_with,
    watcher::FileWatcher,
    AppState,
};
use serde_json::json;
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

fn open_url(url: &str) {
    #[cfg(target_os = "linux")]
    let _ = std::process::Command::new("xdg-open").arg(url).spawn();
    #[cfg(target_os = "macos")]
    let _ = std::process::Command::new("open").arg(url).spawn();
    #[cfg(target_os = "windows")]
    let _ = std::process::Command::new("cmd").args(["/C", "start", "", url]).spawn();
}

// Add a folder to the watched set + persist; returns the updated list as display strings.
fn add_watched(paths: &Arc<Mutex<Vec<std::path::PathBuf>>>, pb: std::path::PathBuf) -> Vec<String> {
    let updated = {
        let mut locked = paths.lock().unwrap();
        if !locked.contains(&pb) {
            locked.push(pb);
        }
        locked.clone()
    };
    let _ = save_config(&updated);
    updated.iter().map(|p| p.display().to_string()).collect()
}

// POST /path-picker — browser-initiated native folder picker. Shows the OS dialog on the GTK/main
// thread (via run_on_main_thread), adds the chosen folder to the watched set, and returns it.
async fn path_picker(handle: tauri::AppHandle, state: AppState) -> Json<serde_json::Value> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    let h2 = handle.clone();
    if handle
        .run_on_main_thread(move || {
            h2.dialog().file().pick_folder(move |folder| {
                let _ = tx.send(folder);
            });
        })
        .is_err()
    {
        return Json(json!({ "ok": false, "chosen": serde_json::Value::Null }));
    }
    let chosen = rx
        .await
        .ok()
        .flatten()
        .and_then(|fp| fp.as_path().map(|p| p.to_path_buf()))
        .filter(|p| p.is_dir());
    match chosen {
        Some(pb) => {
            let paths = add_watched(&state.watched_paths, pb.clone());
            Json(json!({ "ok": true, "chosen": pb.display().to_string(), "paths": paths }))
        }
        None => Json(json!({ "ok": false, "chosen": serde_json::Value::Null })),
    }
}

fn main() {
    logging::init(Some(config_path()));
    let token =
        std::env::var("COMPANION_TOKEN").unwrap_or_else(|_| uuid::Uuid::new_v4().to_string());
    let watched_paths = Arc::new(Mutex::new(load_config()));

    let (watcher_tx, watcher) = match FileWatcher::new(Arc::clone(&watched_paths)) {
        Ok(fw) => {
            let tx = fw.tx.clone();
            (tx, Some(fw))
        }
        Err(e) => {
            logging::warn(format!("file watcher unavailable: {e}"));
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

    // Make the session token discoverable without a console: write it next to the config file.
    // (The viewer also auto-reads it from /ping; this is a fallback.)
    let token_file = config_path().with_file_name("token");
    if let Some(parent) = token_file.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let _ = std::fs::write(&token_file, &token);
    println!("File Viewer Companion (desktop) — server on 127.0.0.1:{PORT}");
    println!("  token: {token}  (also written to {})", token_file.display());
    logging::info(format!("companion (desktop) started on 127.0.0.1:{PORT}"));

    // Values surfaced by the tray menu (Show session token / Open logs folder). The token is also
    // auto-delivered to the viewer via /ping, but the tray makes it discoverable without a console.
    let menu_token = token.clone();
    let menu_token_file = token_file.display().to_string();
    let menu_logs_dir = config_path()
        .parent()
        .map(|p| p.join("logs"))
        .unwrap_or_else(|| std::path::PathBuf::from("logs"))
        .display()
        .to_string();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .setup(move |app| {
            app.manage(WatcherGuard(watcher));

            // Run the HTTP server (shared router + a Tauri-only /path-picker route) on its own
            // runtime thread, now that we have an AppHandle for the native dialog.
            let handle = app.handle().clone();
            let server_state = state.clone();
            std::thread::spawn(move || {
                let rt = tokio::runtime::Builder::new_multi_thread()
                    .enable_all()
                    .build()
                    .expect("tokio runtime");
                rt.block_on(async move {
                    let mw_state = server_state.clone();
                    let picker_handle = handle.clone();
                    let extra: Router<AppState> = Router::new()
                        .route(
                            "/path-picker",
                            post(move |State(st): State<AppState>| {
                                let h = picker_handle.clone();
                                async move { path_picker(h, st).await }
                            }),
                        )
                        .route_layer(middleware::from_fn_with_state(mw_state, require_token));
                    let app = router_with(server_state, PAGES_ORIGIN.to_string(), extra);
                    match tokio::net::TcpListener::bind(("127.0.0.1", PORT)).await {
                        Ok(listener) => {
                            let _ = axum::serve(listener, app).await;
                        }
                        Err(e) => eprintln!("companion: cannot bind 127.0.0.1:{PORT}: {e}"),
                    }
                });
            });

            let status = MenuItemBuilder::with_id("status", format!("Running on 127.0.0.1:{PORT}"))
                .enabled(false)
                .build(app)?;
            let open = MenuItemBuilder::with_id("open", "Open File Viewer").build(app)?;
            let addpath = MenuItemBuilder::with_id("addpath", "Add watched folder…").build(app)?;
            let showtoken = MenuItemBuilder::with_id("token", "Show session token").build(app)?;
            let openlogs = MenuItemBuilder::with_id("logs", "Open logs folder").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let menu = MenuBuilder::new(app)
                .items(&[&status, &open, &addpath, &showtoken, &openlogs, &quit])
                .build()?;

            let wp = Arc::clone(&watched_paths);
            let tok = menu_token.clone();
            let tokf = menu_token_file.clone();
            let logsd = menu_logs_dir.clone();
            let icon = Image::from_bytes(include_bytes!("../icons/32x32.png"))?;
            TrayIconBuilder::with_id("main")
                .icon(icon)
                .tooltip("File Viewer Companion")
                .menu(&menu)
                .on_menu_event(move |app, event| match event.id().as_ref() {
                    "open" => open_url(VIEWER_URL),
                    "token" => {
                        app.dialog()
                            .message(format!(
                                "Session token:\n\n{tok}\n\nThe viewer picks this up automatically via /ping — you normally don't need to copy it. It is also saved at:\n{tokf}"
                            ))
                            .title("File Viewer Companion — session token")
                            .show(|_| {});
                    }
                    "logs" => open_url(&logsd),
                    "addpath" => {
                        let wp2 = Arc::clone(&wp);
                        app.dialog().file().pick_folder(move |folder| {
                            let Some(fp) = folder else { return };
                            let Some(p) = fp.as_path() else { return };
                            let pb = p.to_path_buf();
                            if pb.is_dir() {
                                add_watched(&wp2, pb);
                            }
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
            // Tray-only app: an automatic exit request (last window closed → code None) must NOT
            // quit. But an EXPLICIT app.exit(code) — e.g. the tray "Quit" item → code Some(_) — must
            // be honoured, otherwise Quit does nothing.
            if let tauri::RunEvent::ExitRequested { code, api, .. } = event {
                if code.is_none() {
                    api.prevent_exit();
                }
            }
        });
}
