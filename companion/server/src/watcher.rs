use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::{mpsc, Arc, Mutex};
use std::thread::JoinHandle;
use std::time::{Duration, Instant};
use tokio::sync::broadcast;

#[derive(Clone, Debug, serde::Serialize)]
pub struct WatchEvent {
    pub path: String,
    pub kind: String, // "modify" | "create" | "remove"
}

pub struct FileWatcher {
    pub tx: broadcast::Sender<WatchEvent>,
    watcher: Arc<Mutex<RecommendedWatcher>>,
    active: Arc<Mutex<HashSet<PathBuf>>>,
    failed: Arc<Mutex<HashMap<PathBuf, Instant>>>,
    stop_tx: mpsc::Sender<()>,
    reconcile_thread: Option<JoinHandle<()>>,
}

impl FileWatcher {
    pub fn new(watched_paths: Arc<Mutex<Vec<PathBuf>>>) -> notify::Result<Self> {
        let (tx, _) = broadcast::channel(256);
        let tx_clone = tx.clone();
        let callback_paths = Arc::clone(&watched_paths);

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
                    // `unwatch` and queued OS events can race. Re-check the live root set before
                    // exposing an absolute path so a removed root stops producing SSE immediately.
                    let allowed = callback_paths
                        .lock()
                        .map(|roots| crate::paths::is_within_watched(&path, &roots))
                        .unwrap_or(false);
                    if !allowed {
                        continue;
                    }
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

        let watcher = Arc::new(Mutex::new(watcher));
        let active = Arc::new(Mutex::new(HashSet::new()));
        let failed = Arc::new(Mutex::new(HashMap::new()));
        reconcile_watch_set(&watcher, &active, &failed, &watched_paths);

        // Watched roots can be changed by either the HTTP API or the tray picker. Reconcile the OS
        // subscriptions from the shared root set so both entry points gain identical add/remove
        // behavior without putting a platform watcher handle into Axum state.
        let (stop_tx, stop_rx) = mpsc::channel();
        let thread_watcher = Arc::clone(&watcher);
        let thread_active = Arc::clone(&active);
        let thread_failed = Arc::clone(&failed);
        let thread_paths = Arc::clone(&watched_paths);
        let reconcile_thread = std::thread::spawn(move || loop {
            match stop_rx.recv_timeout(Duration::from_millis(100)) {
                Ok(()) | Err(mpsc::RecvTimeoutError::Disconnected) => break,
                Err(mpsc::RecvTimeoutError::Timeout) => {
                    reconcile_watch_set(
                        &thread_watcher,
                        &thread_active,
                        &thread_failed,
                        &thread_paths,
                    );
                }
            }
        });

        Ok(Self {
            tx,
            watcher,
            active,
            failed,
            stop_tx,
            reconcile_thread: Some(reconcile_thread),
        })
    }

    /// Force an immediate reconciliation. Runtime code also reconciles every 100 ms; this method is
    /// useful for deterministic focused tests and future native callers that want synchronous setup.
    pub fn reconcile_now(&self, watched_paths: &Arc<Mutex<Vec<PathBuf>>>) {
        reconcile_watch_set(&self.watcher, &self.active, &self.failed, watched_paths);
    }

    #[cfg(test)]
    fn active_paths(&self) -> HashSet<PathBuf> {
        self.active.lock().unwrap().clone()
    }
}

impl Drop for FileWatcher {
    fn drop(&mut self) {
        let _ = self.stop_tx.send(());
        if let Some(thread) = self.reconcile_thread.take() {
            let _ = thread.join();
        }
    }
}

fn reconcile_watch_set(
    watcher: &Arc<Mutex<RecommendedWatcher>>,
    active: &Arc<Mutex<HashSet<PathBuf>>>,
    failed: &Arc<Mutex<HashMap<PathBuf, Instant>>>,
    watched_paths: &Arc<Mutex<Vec<PathBuf>>>,
) {
    let desired: HashSet<PathBuf> = watched_paths
        .lock()
        .map(|paths| paths.iter().filter(|path| path.is_dir()).cloned().collect())
        .unwrap_or_default();
    let Ok(mut watcher) = watcher.lock() else {
        crate::logging::error("file watcher lock poisoned");
        return;
    };
    let Ok(mut active) = active.lock() else {
        crate::logging::error("active watcher set lock poisoned");
        return;
    };
    let Ok(mut failed) = failed.lock() else {
        crate::logging::error("failed watcher set lock poisoned");
        return;
    };

    let removed: Vec<PathBuf> = active.difference(&desired).cloned().collect();
    for path in removed {
        if let Err(error) = watcher.unwatch(&path) {
            crate::logging::warn(format!(
                "could not stop watching {}: {error}",
                path.display()
            ));
        }
        // Even if the backend reports an unwatch error, the callback filters against the live
        // watched_paths set, so the removed root can no longer be exposed through SSE.
        active.remove(&path);
    }
    failed.retain(|path, _| desired.contains(path));

    const RETRY_AFTER: Duration = Duration::from_secs(2);
    let added: Vec<PathBuf> = desired
        .difference(&active)
        .filter(|path| {
            failed
                .get(*path)
                .is_none_or(|last_attempt| last_attempt.elapsed() >= RETRY_AFTER)
        })
        .cloned()
        .collect();
    for path in added {
        match watcher.watch(&path, RecursiveMode::Recursive) {
            Ok(()) => {
                failed.remove(&path);
                active.insert(path);
            }
            Err(error) => {
                crate::logging::warn(format!("could not watch {}: {error}", path.display()));
                failed.insert(path, Instant::now());
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::FileWatcher;
    use std::sync::{Arc, Mutex};
    use std::time::{Duration, Instant};

    #[test]
    fn reconcile_tracks_roots_added_and_removed_at_runtime() {
        let first = tempfile::tempdir().unwrap();
        let second = tempfile::tempdir().unwrap();
        let roots = Arc::new(Mutex::new(vec![first.path().to_path_buf()]));
        let watcher = FileWatcher::new(Arc::clone(&roots)).unwrap();
        assert_eq!(
            watcher.active_paths(),
            [first.path().to_path_buf()].into_iter().collect()
        );

        *roots.lock().unwrap() = vec![second.path().to_path_buf()];
        watcher.reconcile_now(&roots);
        assert_eq!(
            watcher.active_paths(),
            [second.path().to_path_buf()].into_iter().collect()
        );
    }

    #[test]
    fn reconcile_retries_a_transiently_failed_root() {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().to_path_buf();
        let roots = Arc::new(Mutex::new(Vec::new()));
        let watcher = FileWatcher::new(Arc::clone(&roots)).unwrap();

        watcher
            .failed
            .lock()
            .unwrap()
            .insert(path.clone(), Instant::now() - Duration::from_secs(3));
        *roots.lock().unwrap() = vec![path.clone()];
        watcher.reconcile_now(&roots);

        assert!(watcher.active_paths().contains(&path));
        assert!(!watcher.failed.lock().unwrap().contains_key(&path));
    }
}
