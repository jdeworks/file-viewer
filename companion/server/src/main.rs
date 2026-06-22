use file_viewer_companion::{config::load_config, router, watcher::FileWatcher, AppState};
use std::sync::{Arc, Mutex};

#[tokio::main]
async fn main() {
    let debug = std::env::args().any(|a| a == "--debug");

    if debug {
        tracing_subscriber::fmt().with_env_filter("info").init();
    }

    let token =
        std::env::var("COMPANION_TOKEN").unwrap_or_else(|_| uuid::Uuid::new_v4().to_string());

    let pages_origin = std::env::var("COMPANION_ORIGIN")
        .unwrap_or_else(|_| "https://jdeworks.github.io".to_string());

    let watched = load_config();

    println!("═══════════════════════════════════");
    println!("  file-viewer companion v0.1.0");
    println!("  Listening on http://127.0.0.1:7700");
    println!("  Token: {token}");
    println!("  (set COMPANION_TOKEN env var to use a fixed token)");
    println!("═══════════════════════════════════");

    let watched_paths = Arc::new(Mutex::new(watched));

    // Start the file watcher. On failure (e.g. inotify limit), warn and use a
    // no-op broadcast channel so the rest of the server still starts.
    let (watcher_tx, _watcher) = match FileWatcher::new(Arc::clone(&watched_paths)) {
        Ok(fw) => {
            let tx = fw.tx.clone();
            (tx, Some(fw))
        }
        Err(e) => {
            eprintln!("Warning: file watcher could not start: {e}");
            let (tx, _) = tokio::sync::broadcast::channel(1);
            (tx, None)
        }
    };

    let state = AppState {
        token,
        watched_paths,
        debug,
        watcher_tx,
    };

    let app = router(state, pages_origin);

    // Keep _watcher alive for the lifetime of main so FS events keep flowing.
    let _keep = _watcher;

    let listener = tokio::net::TcpListener::bind("127.0.0.1:7700")
        .await
        .unwrap();
    axum::serve(listener, app).await.unwrap();
}
