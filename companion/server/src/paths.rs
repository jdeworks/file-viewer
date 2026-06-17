use std::path::{Path, PathBuf};

/// Returns true only if `path` starts with one of the watched paths.
/// Paths with `..` components are rejected because they may escape the
/// watched directory even if the string starts with the right prefix.
pub fn is_within_watched(path: &Path, watched: &[PathBuf]) -> bool {
    // Reject any path that contains a `..` component — these can silently
    // bypass a starts_with check (e.g. /watched/../secret).
    if path
        .components()
        .any(|c| c == std::path::Component::ParentDir)
    {
        return false;
    }
    watched.iter().any(|w| path.starts_with(w))
}

/// Canonicalize `path` and verify it remains within a watched directory.
/// Returns the canonical path or an error string.
pub fn validate_path(path: &Path, watched: &[PathBuf]) -> Result<PathBuf, String> {
    let canonical = std::fs::canonicalize(path)
        .map_err(|e| format!("Cannot resolve path '{}': {}", path.display(), e))?;

    if watched.iter().any(|w| {
        std::fs::canonicalize(w)
            .map(|cw| canonical.starts_with(&cw))
            .unwrap_or(false)
    }) {
        Ok(canonical)
    } else {
        Err(format!(
            "Path '{}' is not within any watched directory",
            canonical.display()
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_within_watched_true() {
        let watched = vec![PathBuf::from("/home/user/docs")];
        assert!(is_within_watched(
            &PathBuf::from("/home/user/docs/file.txt"),
            &watched
        ));
    }

    #[test]
    fn test_within_watched_false_escape() {
        let watched = vec![PathBuf::from("/home/user/docs")];
        assert!(!is_within_watched(
            &PathBuf::from("/home/user/secret.txt"),
            &watched
        ));
    }

    #[test]
    fn test_path_traversal_blocked() {
        let watched = vec![PathBuf::from("/home/user/docs")];
        // Path traversal attempt — rejected before starts_with can be fooled.
        assert!(!is_within_watched(
            &PathBuf::from("/home/user/docs/../secret.txt"),
            &watched
        ));
    }

    #[test]
    fn test_within_watched_exact_dir() {
        let watched = vec![PathBuf::from("/home/user/docs")];
        // The watched dir itself is considered within.
        assert!(is_within_watched(
            &PathBuf::from("/home/user/docs"),
            &watched
        ));
    }

    #[test]
    fn test_within_watched_prefix_not_enough() {
        // /home/user/docs-extra must NOT match /home/user/docs
        let watched = vec![PathBuf::from("/home/user/docs")];
        assert!(!is_within_watched(
            &PathBuf::from("/home/user/docs-extra/file.txt"),
            &watched
        ));
    }

    #[test]
    fn test_within_watched_multiple_roots() {
        let watched = vec![
            PathBuf::from("/home/user/docs"),
            PathBuf::from("/home/user/music"),
        ];
        assert!(is_within_watched(
            &PathBuf::from("/home/user/music/track.mp3"),
            &watched
        ));
        assert!(!is_within_watched(
            &PathBuf::from("/home/user/videos/clip.mp4"),
            &watched
        ));
    }
}
