use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Default)]
struct Config {
    watched_paths: Vec<String>,
}

pub fn config_path() -> PathBuf {
    // COMPANION_CONFIG overrides the location — used by the e2e test to isolate from the real
    // user config (so tests never read or clobber a developer's watched-paths).
    if let Ok(p) = std::env::var("COMPANION_CONFIG") {
        return PathBuf::from(p);
    }
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("file-viewer-companion")
        .join("config.json")
}

pub fn load_config() -> Vec<PathBuf> {
    let path = config_path();
    let Ok(data) = std::fs::read_to_string(&path) else {
        return vec![];
    };
    let Ok(cfg): Result<Config, _> = serde_json::from_str(&data) else {
        return vec![];
    };
    cfg.watched_paths
        .into_iter()
        .map(PathBuf::from)
        .filter(|p| p.is_dir())
        .collect()
}

pub fn save_config(paths: &[PathBuf]) -> std::io::Result<()> {
    let path = config_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let cfg = Config {
        watched_paths: paths.iter().map(|p| p.display().to_string()).collect(),
    };
    let data = serde_json::to_string_pretty(&cfg).expect("serialize config");
    std::fs::write(&path, data)
}
