use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tokio::sync::broadcast;

#[derive(Clone, Debug, serde::Serialize)]
pub struct WatchEvent {
    pub path: String,
    pub kind: String, // "modify" | "create" | "remove"
}

pub struct FileWatcher {
    pub tx: broadcast::Sender<WatchEvent>,
    _watcher: RecommendedWatcher,
}

impl FileWatcher {
    pub fn new(watched_paths: Arc<Mutex<Vec<PathBuf>>>) -> notify::Result<Self> {
        let (tx, _) = broadcast::channel(256);
        let tx_clone = tx.clone();

        let mut watcher = notify::recommended_watcher(move |res: notify::Result<Event>| {
            if let Ok(event) = res {
                let kind = match event.kind {
                    notify::EventKind::Modify(_) => "modify",
                    notify::EventKind::Create(_) => "create",
                    notify::EventKind::Remove(_) => "remove",
                    notify::EventKind::Access(_) => return,
                    _ => return, // ignore "other" / rename/any variants we don't need
                };
                for path in event.paths {
                    let path_str = path.to_string_lossy().to_string();
                    crate::logging::info(format!("file {kind} on disk: {path_str}"));
                    let _ = tx_clone.send(WatchEvent {
                        path: path_str,
                        kind: kind.to_string(),
                    });
                }
            }
        })?;

        // Configure the watcher with default settings.
        watcher.configure(Config::default())?;

        // Watch all currently configured paths.
        let paths = watched_paths.lock().unwrap().clone();
        for p in &paths {
            let _ = watcher.watch(p, RecursiveMode::Recursive);
        }

        Ok(Self {
            tx,
            _watcher: watcher,
        })
    }
}
