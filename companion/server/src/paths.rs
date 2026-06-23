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

/// Like [`validate_path`], but also permits a path that does NOT yet exist (file creation): in that
/// case the file's PARENT directory must exist and canonicalize to within a watched folder. Returns
/// the absolute path to write to (canonical parent joined with the file name). This is what powers
/// the "create a new file in a watched folder" flow — an existing path still goes through the
/// stricter [`validate_path`].
pub fn validate_path_for_write(path: &Path, watched: &[PathBuf]) -> Result<PathBuf, String> {
    if path.exists() {
        return validate_path(path, watched);
    }
    let parent = path
        .parent()
        .filter(|p| !p.as_os_str().is_empty())
        .ok_or_else(|| format!("Path '{}' has no parent directory", path.display()))?;
    let file_name = path
        .file_name()
        .ok_or_else(|| format!("Path '{}' has no file name", path.display()))?;
    // Canonicalize the PARENT (it must exist); this also resolves any `..` so a path like
    // /watched/../etc/passwd ends up outside the watched set and is rejected below.
    let canonical_parent = std::fs::canonicalize(parent)
        .map_err(|e| format!("Cannot resolve parent of '{}': {}", path.display(), e))?;
    if watched.iter().any(|w| {
        std::fs::canonicalize(w)
            .map(|cw| canonical_parent.starts_with(&cw))
            .unwrap_or(false)
    }) {
        Ok(canonical_parent.join(file_name))
    } else {
        Err(format!(
            "Path '{}' is not within any watched directory",
            path.display()
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

    #[test]
    fn test_validate_for_write_creates_new_file_in_watched() {
        let tmp = tempfile::TempDir::new().unwrap();
        let watched = vec![tmp.path().to_path_buf()];
        let new_file = tmp.path().join("brand-new.txt"); // does NOT exist yet
        let resolved = validate_path_for_write(&new_file, &watched).unwrap();
        assert!(resolved.ends_with("brand-new.txt"));
        // Resolved path is inside the (canonicalized) watched dir.
        let cw = std::fs::canonicalize(tmp.path()).unwrap();
        assert!(resolved.starts_with(&cw));
    }

    #[test]
    fn test_validate_for_write_rejects_new_file_outside_watched() {
        let tmp = tempfile::TempDir::new().unwrap();
        let other = tempfile::TempDir::new().unwrap();
        let watched = vec![tmp.path().to_path_buf()];
        let new_file = other.path().join("nope.txt"); // parent not watched
        assert!(validate_path_for_write(&new_file, &watched).is_err());
    }

    #[test]
    fn test_validate_for_write_rejects_traversal_parent() {
        let tmp = tempfile::TempDir::new().unwrap();
        let watched = vec![tmp.path().to_path_buf()];
        // Parent escapes the watched dir via `..`; canonicalize resolves it out of scope.
        let escaped = tmp.path().join("..").join("escaped.txt");
        assert!(validate_path_for_write(&escaped, &watched).is_err());
    }
}
