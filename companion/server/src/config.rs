use serde::{Deserialize, Serialize};
use std::io::Write;
use std::path::{Path, PathBuf};

use crate::atomic_replace::replace_file;

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
    match try_load_config_from(&path) {
        Ok(paths) => paths,
        Err(error) => {
            crate::logging::error(format!(
                "could not load config {}: {error}; starting with no watched folders",
                path.display()
            ));
            vec![]
        }
    }
}

pub fn load_config_from(path: &Path) -> Vec<PathBuf> {
    try_load_config_from(path).unwrap_or_default()
}

fn try_load_config_from(path: &Path) -> Result<Vec<PathBuf>, String> {
    let data = match std::fs::read_to_string(path) {
        Ok(data) => data,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(vec![]),
        Err(error) => return Err(error.to_string()),
    };
    let cfg: Config = serde_json::from_str(&data).map_err(|error| error.to_string())?;
    Ok(cfg
        .watched_paths
        .into_iter()
        .map(PathBuf::from)
        // Relative roots depend on the process working directory and are therefore not a stable
        // filesystem boundary. The API and native picker both persist absolute paths.
        .filter(|p| p.is_absolute() && p.is_dir())
        .collect())
}

pub fn save_config(paths: &[PathBuf]) -> std::io::Result<()> {
    save_config_to(&config_path(), paths)
}

/// Persist watched roots atomically beside the previous config.
///
/// The temporary file is created in the same directory so the final rename cannot cross
/// filesystems. Failures remove the temporary file and leave an existing config untouched.
pub fn save_config_to(path: &Path, paths: &[PathBuf]) -> std::io::Result<()> {
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent)?;
        }
    }
    let cfg = Config {
        watched_paths: paths.iter().map(|p| p.display().to_string()).collect(),
    };
    let data = serde_json::to_string_pretty(&cfg).expect("serialize config");

    let parent = path
        .parent()
        .filter(|p| !p.as_os_str().is_empty())
        .unwrap_or_else(|| Path::new("."));
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("config.json");
    let temp = parent.join(format!(".{name}.{}.tmp", uuid::Uuid::new_v4()));

    let result = (|| {
        let mut options = std::fs::OpenOptions::new();
        options.write(true).create_new(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            options.mode(0o600);
        }
        let mut file = options.open(&temp)?;
        file.write_all(data.as_bytes())?;
        file.sync_all()?;
        drop(file);
        replace_file(&temp, path)?;

        // Persist the directory entry on Unix where opening directories for sync is supported.
        #[cfg(unix)]
        if let Ok(dir) = std::fs::File::open(parent) {
            let _ = dir.sync_all();
        }
        Ok(())
    })();

    if result.is_err() {
        let _ = std::fs::remove_file(&temp);
    }
    result
}

#[cfg(test)]
mod tests {
    use super::{load_config_from, save_config_to, try_load_config_from};
    use std::path::PathBuf;

    #[test]
    fn atomic_save_round_trips_absolute_existing_roots() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path().join("watched");
        std::fs::create_dir(&root).unwrap();
        let config = tmp.path().join("state").join("config.json");

        save_config_to(&config, std::slice::from_ref(&root)).unwrap();

        assert_eq!(load_config_from(&config), vec![root]);
        let leftovers: Vec<_> = std::fs::read_dir(config.parent().unwrap())
            .unwrap()
            .flatten()
            .filter(|entry| entry.file_name().to_string_lossy().ends_with(".tmp"))
            .collect();
        assert!(
            leftovers.is_empty(),
            "atomic save left temporary files behind"
        );
    }

    #[test]
    fn failed_atomic_save_cleans_temp_and_does_not_replace_directory() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path().join("watched");
        std::fs::create_dir(&root).unwrap();
        let config = tmp.path().join("config.json");
        save_config_to(&config, std::slice::from_ref(&root)).unwrap();
        let before = std::fs::read(&config).unwrap();

        // A directory cannot be atomically renamed over a config file. This deterministically
        // exercises the failure path without relying on process-global environment variables.
        let impossible = tmp.path().join("config-dir");
        std::fs::create_dir(&impossible).unwrap();
        assert!(save_config_to(&impossible, &[PathBuf::from("/not-used")]).is_err());

        assert_eq!(std::fs::read(&config).unwrap(), before);
        assert!(impossible.is_dir());
        assert!(!std::fs::read_dir(tmp.path())
            .unwrap()
            .flatten()
            .any(|entry| entry.file_name().to_string_lossy().ends_with(".tmp")));
    }

    #[cfg(unix)]
    #[test]
    fn failed_atomic_save_leaves_existing_config_bytes_unchanged() {
        use std::os::unix::fs::PermissionsExt;
        let tmp = tempfile::tempdir().unwrap();
        let state_dir = tmp.path().join("state");
        std::fs::create_dir(&state_dir).unwrap();
        let config = state_dir.join("config.json");
        save_config_to(&config, &[]).unwrap();
        let before = std::fs::read(&config).unwrap();

        std::fs::set_permissions(&state_dir, std::fs::Permissions::from_mode(0o500)).unwrap();
        let result = save_config_to(&config, &[tmp.path().to_path_buf()]);
        std::fs::set_permissions(&state_dir, std::fs::Permissions::from_mode(0o700)).unwrap();

        assert!(result.is_err());
        assert_eq!(std::fs::read(&config).unwrap(), before);
    }

    #[test]
    fn load_ignores_relative_and_missing_roots() {
        let tmp = tempfile::tempdir().unwrap();
        let config = tmp.path().join("config.json");
        std::fs::write(
            &config,
            r#"{"watched_paths":["relative","/definitely/missing/file-viewer-root"]}"#,
        )
        .unwrap();
        assert!(load_config_from(&config).is_empty());
    }

    #[test]
    fn checked_loader_reports_corrupt_json_instead_of_treating_it_as_empty() {
        let tmp = tempfile::tempdir().unwrap();
        let config = tmp.path().join("config.json");
        std::fs::write(&config, b"{not valid json").unwrap();

        assert!(try_load_config_from(&config).is_err());
    }

    #[cfg(unix)]
    #[test]
    fn new_config_is_private_to_the_user() {
        use std::os::unix::fs::PermissionsExt;
        let tmp = tempfile::tempdir().unwrap();
        let config = tmp.path().join("config.json");
        save_config_to(&config, &[]).unwrap();
        assert_eq!(
            std::fs::metadata(config).unwrap().permissions().mode() & 0o077,
            0
        );
    }
}
