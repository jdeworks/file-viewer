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
    bind_server_listener,
    config::{config_path, load_config, save_config_to},
    logging, router_with,
    watcher::FileWatcher,
    AppState,
};
use serde_json::json;
use std::sync::{Arc, Mutex};
use tauri::{
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

// Build the tray icon as a 32×32 RGBA: a brand-blue disc with a status dot in the corner — green
// when a viewer is connected (recent /ping), red when idle. Synthesized in code so there's no image
// dependency and no asset to ship.
fn status_icon(connected: bool) -> tauri::image::Image<'static> {
    const S: i32 = 32;
    let mut buf = vec![0u8; (S * S * 4) as usize];
    let mut px = |x: i32, y: i32, c: [u8; 4]| {
        if x < 0 || y < 0 || x >= S || y >= S {
            return;
        }
        let i = ((y * S + x) * 4) as usize;
        buf[i] = c[0];
        buf[i + 1] = c[1];
        buf[i + 2] = c[2];
        buf[i + 3] = c[3];
    };
    // Base disc.
    let (cx, cy, r) = (16.0f32, 16.0f32, 14.0f32);
    for y in 0..S {
        for x in 0..S {
            let dx = x as f32 + 0.5 - cx;
            let dy = y as f32 + 0.5 - cy;
            if dx * dx + dy * dy <= r * r {
                px(x, y, [0x15, 0x65, 0xc0, 0xff]);
            }
        }
    }
    // Status dot (bottom-right) with a white ring so it reads on any background.
    let (sx, sy, sr) = (24.0f32, 24.0f32, 7.0f32);
    let dot = if connected {
        [0x2f, 0x9e, 0x44, 0xff]
    } else {
        [0xd9, 0x36, 0x2b, 0xff]
    };
    for y in 0..S {
        for x in 0..S {
            let dx = x as f32 + 0.5 - sx;
            let dy = y as f32 + 0.5 - sy;
            let d2 = dx * dx + dy * dy;
            if d2 <= sr * sr {
                px(x, y, dot);
            } else if d2 <= (sr + 1.6) * (sr + 1.6) {
                px(x, y, [0xff, 0xff, 0xff, 0xff]);
            }
        }
    }
    tauri::image::Image::new_owned(buf, S as u32, S as u32)
}

// Register the `fvcompanion://` URL scheme so the browser can LAUNCH this app (the viewer's
// connection button opens `fvcompanion://start`, the OS prompts "Open File Viewer Companion?" and
// runs us). Windows-only for now, dependency-free via `reg`. Idempotent — re-runs each start so the
// command always points at the current exe. We ignore the URL argument on launch; just starting is
// the point.
#[cfg(target_os = "windows")]
fn register_url_scheme() {
    let exe = match std::env::current_exe() {
        Ok(p) => p.display().to_string(),
        Err(_) => return,
    };
    let base = r"HKCU\Software\Classes\fvcompanion";
    let cmd = format!("\"{exe}\" \"%1\"");
    let reg = |args: &[&str]| {
        let _ = std::process::Command::new("reg").args(args).output();
    };
    reg(&["add", base, "/ve", "/d", "URL:File Viewer Companion", "/f"]);
    reg(&["add", base, "/v", "URL Protocol", "/d", "", "/f"]);
    reg(&[
        "add",
        &format!(r"{base}\shell\open\command"),
        "/ve",
        "/d",
        &cmd,
        "/f",
    ]);
    logging::info("registered fvcompanion:// URL scheme");
}

fn open_url(url: &str) {
    #[cfg(target_os = "linux")]
    let _ = std::process::Command::new("xdg-open").arg(url).spawn();
    #[cfg(target_os = "macos")]
    let _ = std::process::Command::new("open").arg(url).spawn();
    #[cfg(target_os = "windows")]
    let _ = std::process::Command::new("cmd")
        .args(["/C", "start", "", url])
        .spawn();
}

// Add a folder transactionally: persistence must succeed before the in-memory set changes.
fn add_watched(
    paths: &Arc<Mutex<Vec<std::path::PathBuf>>>,
    config_path: &std::path::Path,
    pb: std::path::PathBuf,
) -> std::io::Result<Vec<String>> {
    let mut locked = paths.lock().unwrap();
    if !locked.contains(&pb) {
        let mut updated = locked.clone();
        updated.push(pb);
        save_config_to(config_path, &updated)?;
        *locked = updated;
    }
    Ok(locked.iter().map(|p| p.display().to_string()).collect())
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
        Some(pb) => match add_watched(&state.watched_paths, &state.config_path, pb.clone()) {
            Ok(paths) => {
                Json(json!({ "ok": true, "chosen": pb.display().to_string(), "paths": paths }))
            }
            Err(error) => {
                logging::error(format!(
                    "native picker could not persist watched folder: {error}"
                ));
                Json(json!({
                    "ok": false,
                    "chosen": serde_json::Value::Null,
                    "error": "could not persist watched folder configuration"
                }))
            }
        },
        None => Json(json!({ "ok": false, "chosen": serde_json::Value::Null })),
    }
}

fn main() {
    let app_config_path = config_path();
    logging::init(Some(app_config_path.clone()));

    // The listening socket is the cross-platform single-instance claim shared with the standalone
    // server. Reserve it before creating the watcher or tray so a second launch exits cleanly.
    let server_listener = match bind_server_listener(PORT) {
        Ok(listener) => listener,
        Err(e) => {
            logging::info(format!(
                "companion not started: 127.0.0.1:{PORT} is unavailable ({e})"
            ));
            return;
        }
    };

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
        config_path: app_config_path.clone(),
        debug: false,
        watcher_tx,
    };

    // Make the session token discoverable without a console: write it next to the config file.
    // (The viewer also auto-reads it from /ping; this is a fallback.)
    let token_file = app_config_path.with_file_name("token");
    if let Some(parent) = token_file.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let _ = std::fs::write(&token_file, &token);
    println!("File Viewer Companion (desktop) — server on 127.0.0.1:{PORT}");
    println!(
        "  token: {token}  (also written to {})",
        token_file.display()
    );
    logging::info(format!("companion (desktop) started on 127.0.0.1:{PORT}"));

    // Let the browser launch us on demand via the fvcompanion:// scheme (one-click "start it").
    #[cfg(target_os = "windows")]
    register_url_scheme();

    // Values surfaced by the tray menu (Show session token / Open logs folder). The token is also
    // auto-delivered to the viewer via /ping, but the tray makes it discoverable without a console.
    let menu_token = token.clone();
    let menu_token_file = token_file.display().to_string();
    let menu_config_path = app_config_path.clone();
    let menu_logs_dir = app_config_path
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
                    let listener = match tokio::net::TcpListener::from_std(server_listener) {
                        Ok(listener) => listener,
                        Err(e) => {
                            logging::error(format!("cannot start companion server: {e}"));
                            handle.exit(1);
                            return;
                        }
                    };
                    if let Err(e) = axum::serve(listener, app).await {
                        logging::error(format!("companion server stopped: {e}"));
                        handle.exit(1);
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
            let config = menu_config_path.clone();
            TrayIconBuilder::with_id("main")
                .icon(status_icon(false))
                .tooltip("File Viewer Companion — idle (no viewer connected)")
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
                        let config2 = config.clone();
                        let error_dialog = app.clone();
                        app.dialog().file().pick_folder(move |folder| {
                            let Some(fp) = folder else { return };
                            let Some(p) = fp.as_path() else { return };
                            let pb = p.to_path_buf();
                            if pb.is_dir() {
                                if let Err(error) = add_watched(&wp2, &config2, pb) {
                                    logging::error(format!(
                                        "tray picker could not persist watched folder: {error}"
                                    ));
                                    error_dialog
                                        .dialog()
                                        .message("The folder was not added because the Companion could not save its configuration.")
                                        .title("File Viewer Companion")
                                        .show(|_| {});
                                }
                            }
                        });
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            // Poll the connection state every 3s and reflect it in the tray icon's status dot
            // (green = a viewer pinged within ~45s, red = idle). Updates only run on a state change.
            let status_handle = app.handle().clone();
            std::thread::spawn(move || {
                let mut last: Option<bool> = None;
                loop {
                    std::thread::sleep(std::time::Duration::from_secs(3));
                    let connected = file_viewer_companion::routes::seconds_since_last_ping() < 45;
                    if Some(connected) == last {
                        continue;
                    }
                    last = Some(connected);
                    let h = status_handle.clone();
                    let _ = status_handle.run_on_main_thread(move || {
                        if let Some(tray) = h.tray_by_id("main") {
                            let _ = tray.set_icon(Some(status_icon(connected)));
                            let _ = tray.set_tooltip(Some(if connected {
                                "File Viewer Companion — viewer connected"
                            } else {
                                "File Viewer Companion — idle (no viewer connected)"
                            }));
                        }
                    });
                }
            });
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

#[cfg(test)]
mod tests {
    use super::add_watched;
    use std::sync::{Arc, Mutex};

    #[test]
    fn native_add_rolls_back_memory_when_persistence_fails() {
        let base =
            std::env::temp_dir().join(format!("fv-companion-tauri-test-{}", uuid::Uuid::new_v4()));
        let watched = base.join("watched");
        let impossible_config = base.join("config-dir");
        std::fs::create_dir_all(&watched).unwrap();
        std::fs::create_dir(&impossible_config).unwrap();
        let paths = Arc::new(Mutex::new(Vec::new()));

        let result = add_watched(&paths, &impossible_config, watched);

        assert!(result.is_err());
        assert!(paths.lock().unwrap().is_empty());
        std::fs::remove_dir_all(base).unwrap();
    }
}
