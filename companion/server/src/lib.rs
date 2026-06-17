pub mod auth;
pub mod config;
pub mod finder;
pub mod paths;
pub mod routes;
pub mod watcher;

use std::sync::{Arc, Mutex};
use tokio::sync::broadcast;
use watcher::WatchEvent;

#[derive(Clone)]
pub struct AppState {
    pub token: String,
    pub watched_paths: Arc<Mutex<Vec<std::path::PathBuf>>>,
    pub debug: bool,
    pub watcher_tx: broadcast::Sender<WatchEvent>,
}
