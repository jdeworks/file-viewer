use file_viewer_companion::{
    config::{config_path, load_config},
    logging, router,
    watcher::FileWatcher,
    AppState,
};
use std::sync::{Arc, Mutex};

#[tokio::main]
async fn main() {
    let debug = std::env::args().any(|a| a == "--debug");

    if debug {
        tracing_subscriber::fmt().with_env_filter("info").init();
    }

    // Logging writes to stdout + a daily file next to config.json (logs/companion-YYYY-MM-DD.log),
    // kept for 7 days. Always on — running the bare server now shows live activity.
    logging::init(Some(config_path()));

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
    logging::info(format!(
        "companion started on 127.0.0.1:7700 ({} watched folder(s))",
        watched.len()
    ));

    let watched_paths = Arc::new(Mutex::new(watched));

    // Start the file watcher. On failure (e.g. inotify limit), warn and use a
    // no-op broadcast channel so the rest of the server still starts.
    let (watcher_tx, _watcher) = match FileWatcher::new(Arc::clone(&watched_paths)) {
        Ok(fw) => {
            let tx = fw.tx.clone();
            (tx, Some(fw))
        }
        Err(e) => {
            logging::warn(format!("file watcher could not start: {e}"));
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

    let listener = match tokio::net::TcpListener::bind("127.0.0.1:7700").await {
        Ok(l) => l,
        Err(e) => {
            eprintln!();
            eprintln!("ERROR: could not start — 127.0.0.1:7700 is already in use ({e}).");
            eprintln!("Another companion (the tray app or another console server) is already");
            eprintln!("running. Quit it first (tray → Quit, or end it in Task Manager), then");
            eprintln!("run this again.");
            logging::error(format!("cannot bind 127.0.0.1:7700: {e}"));
            // Keep the console window open so the message is readable (Windows closes it on exit).
            eprintln!();
            eprint!("Press Enter to close…");
            let mut _line = String::new();
            let _ = std::io::stdin().read_line(&mut _line);
            std::process::exit(1);
        }
    };
    if let Err(e) = axum::serve(listener, app).await {
        logging::error(format!("server stopped: {e}"));
    }
}
