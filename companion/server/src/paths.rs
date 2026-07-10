use std::path::{Component, Path, PathBuf};

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
    if !path.is_absolute() {
        return Err(format!("Path '{}' is not absolute", path.display()));
    }
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

/// Like [`validate_path`], but also permits a path that does NOT yet exist (file creation), even
/// inside subfolders that don't exist yet — as long as the nearest ANCESTOR that does exist sits
/// within a watched folder. (The immediate parent need not exist; the caller creates the missing
/// intermediate directories.) An existing path still goes through the stricter [`validate_path`].
/// Returns the absolute path to write to (built under the canonicalized existing ancestor).
pub fn validate_path_for_write(path: &Path, watched: &[PathBuf]) -> Result<PathBuf, String> {
    if !path.is_absolute() {
        return Err(format!("Path '{}' is not absolute", path.display()));
    }
    if path.exists() {
        return validate_path(path, watched);
    }
    // Reject explicit traversal up front: with no `..` component, any descendant of a watched dir is
    // guaranteed to stay within it, so checking the nearest existing ancestor is sufficient.
    if path.components().any(|c| c == Component::ParentDir) {
        return Err(format!(
            "Path '{}' contains a '..' component",
            path.display()
        ));
    }
    if path.file_name().is_none() {
        return Err(format!("Path '{}' has no file name", path.display()));
    }
    // Walk up to the nearest ancestor directory that already exists on disk.
    let mut existing: Option<&Path> = None;
    let mut cur = path.parent();
    while let Some(a) = cur {
        if a.as_os_str().is_empty() {
            break;
        }
        if a.exists() {
            existing = Some(a);
            break;
        }
        cur = a.parent();
    }
    let existing =
        existing.ok_or_else(|| format!("No existing parent directory for '{}'", path.display()))?;
    // Canonicalize the existing ancestor (resolves symlinks/`.`); it must be within a watched dir.
    let canonical_existing = std::fs::canonicalize(existing)
        .map_err(|e| format!("Cannot resolve '{}': {}", existing.display(), e))?;
    if !watched.iter().any(|w| {
        std::fs::canonicalize(w)
            .map(|cw| canonical_existing.starts_with(&cw))
            .unwrap_or(false)
    }) {
        return Err(format!(
            "Path '{}' is not within any watched directory",
            path.display()
        ));
    }
    // Re-root the not-yet-existing tail (e.g. `subfolder/new.txt`) under the canonical ancestor.
    let tail = path.strip_prefix(existing).map_err(|_| {
        format!(
            "Cannot resolve '{}' under a watched directory",
            path.display()
        )
    })?;
    Ok(canonical_existing.join(tail))
}

/// True when `directory` is a watched root or contains another watched root below it.
/// Recursive deletion must reject both cases.
pub fn contains_watched_root(directory: &Path, watched: &[PathBuf]) -> bool {
    watched.iter().any(|root| {
        std::fs::canonicalize(root)
            .map(|canonical_root| canonical_root.starts_with(directory))
            .unwrap_or(false)
    })
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
    fn test_validate_for_write_allows_new_nested_subfolder() {
        let tmp = tempfile::TempDir::new().unwrap();
        let watched = vec![tmp.path().to_path_buf()];
        // Neither the subfolders nor the file exist yet — still valid (parent is created on save).
        let nested = tmp.path().join("sub").join("deeper").join("new.txt");
        let resolved = validate_path_for_write(&nested, &watched).unwrap();
        assert!(resolved.ends_with("new.txt"));
        let cw = std::fs::canonicalize(tmp.path()).unwrap();
        assert!(
            resolved.starts_with(&cw),
            "resolved {resolved:?} not under {cw:?}"
        );
    }

    #[test]
    fn test_validate_for_write_rejects_traversal_parent() {
        let tmp = tempfile::TempDir::new().unwrap();
        let watched = vec![tmp.path().to_path_buf()];
        // Parent escapes the watched dir via `..`; canonicalize resolves it out of scope.
        let escaped = tmp.path().join("..").join("escaped.txt");
        assert!(validate_path_for_write(&escaped, &watched).is_err());
    }

    #[test]
    fn test_contains_nested_watched_root() {
        let tmp = tempfile::TempDir::new().unwrap();
        let parent = tmp.path().join("parent");
        let nested = parent.join("nested");
        std::fs::create_dir_all(&nested).unwrap();
        let canonical_parent = std::fs::canonicalize(&parent).unwrap();
        assert!(contains_watched_root(&canonical_parent, &[nested]));
    }

    #[test]
    fn test_validate_rejects_relative_path() {
        let tmp = tempfile::TempDir::new().unwrap();
        assert!(validate_path(Path::new("relative.txt"), &[tmp.path().to_path_buf()]).is_err());
        assert!(
            validate_path_for_write(Path::new("relative.txt"), &[tmp.path().to_path_buf()])
                .is_err()
        );
    }

    #[cfg(unix)]
    #[test]
    fn test_validate_rejects_symlink_escape_for_existing_and_new_files() {
        use std::os::unix::fs::symlink;
        let watched = tempfile::TempDir::new().unwrap();
        let outside = tempfile::TempDir::new().unwrap();
        std::fs::write(outside.path().join("secret.txt"), b"secret").unwrap();
        let link = watched.path().join("escape");
        symlink(outside.path(), &link).unwrap();

        assert!(validate_path(&link.join("secret.txt"), &[watched.path().to_path_buf()]).is_err());
        assert!(
            validate_path_for_write(&link.join("new.txt"), &[watched.path().to_path_buf()])
                .is_err()
        );
    }
}
