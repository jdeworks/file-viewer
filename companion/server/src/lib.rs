pub mod auth;
pub mod config;
pub mod finder;
pub mod paths;
pub mod routes;

use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct AppState {
    pub token: String,
    pub watched_paths: Arc<Mutex<Vec<std::path::PathBuf>>>,
    pub debug: bool,
}
