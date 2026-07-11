use std::collections::HashSet;
use std::path::{Component, Path, PathBuf};

pub const FIND_MAX_ENTRIES: usize = 50_000;
pub const FIND_MAX_DEPTH: usize = 64;
pub const FIND_MAX_MATCHES: usize = 128;

pub struct FindFileResult {
    pub matches: Vec<PathBuf>,
    pub truncated: bool,
}

/// Walk all watched directories and return every file whose name and byte-size
/// match the given arguments.
pub fn find_file(name: &str, size: u64, watched: &[PathBuf]) -> FindFileResult {
    find_file_with_limits(
        name,
        size,
        watched,
        FIND_MAX_ENTRIES,
        FIND_MAX_DEPTH,
        FIND_MAX_MATCHES,
    )
}

fn find_file_with_limits(
    name: &str,
    size: u64,
    watched: &[PathBuf],
    max_entries: usize,
    max_depth: usize,
    max_matches: usize,
) -> FindFileResult {
    let mut result = FindFileResult {
        matches: Vec::new(),
        truncated: false,
    };
    let mut visited = 0usize;
    let mut seen_roots = HashSet::new();
    for root in watched {
        let Ok(root) = std::fs::canonicalize(root) else {
            continue;
        };
        if !seen_roots.insert(root.clone()) {
            continue;
        }
        walk_for_file(
            &root,
            name,
            size,
            0,
            max_entries,
            max_depth,
            max_matches,
            &mut visited,
            &mut result,
        );
        if result.truncated {
            break;
        }
    }
    result
}

#[allow(clippy::too_many_arguments)]
fn walk_for_file(
    dir: &Path,
    name: &str,
    size: u64,
    depth: usize,
    max_entries: usize,
    max_depth: usize,
    max_matches: usize,
    visited: &mut usize,
    result: &mut FindFileResult,
) {
    if depth > max_depth {
        result.truncated = true;
        return;
    }
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    for entry in entries.flatten() {
        if *visited >= max_entries || result.matches.len() >= max_matches {
            result.truncated = true;
            return;
        }
        *visited += 1;
        let path = entry.path();
        let Ok(file_type) = entry.file_type() else {
            continue;
        };
        // Recursive symlinks can leave the watched tree or form cycles. Content routes still
        // canonicalize independently, but the unauthenticated finder must remain bounded itself.
        if file_type.is_symlink() {
            continue;
        }
        if file_type.is_dir() {
            walk_for_file(
                &path,
                name,
                size,
                depth + 1,
                max_entries,
                max_depth,
                max_matches,
                visited,
                result,
            );
            if result.truncated {
                return;
            }
        } else if file_type.is_file() && path.file_name().and_then(|n| n.to_str()) == Some(name) {
            if let Ok(meta) = std::fs::metadata(&path) {
                if meta.len() == size {
                    result.matches.push(path);
                }
            }
        }
    }
}

/// Resolve a dropped folder's ABSOLUTE path from a file's `webkitRelativePath`.
///
/// The browser hands us the relative path of one file inside the dropped folder, e.g.
/// `"test/folder 2/New Text Document.txt"` — its FIRST segment (`test`) is the dropped folder's own
/// name and the rest is the path under it. We return the absolute path of that dropped folder for
/// each watched root that contains it, because the browser appends `webkitRelativePath` minus its
/// first segment to this value. Two layouts are handled:
///   1. the watched root IS the dropped folder (root basename == first segment), or
///   2. the dropped folder sits directly inside the watched root.
pub fn find_folder(rel_path: &str, watched: &[PathBuf]) -> Vec<PathBuf> {
    let rel = Path::new(rel_path);
    if rel.is_absolute()
        || rel
            .components()
            .any(|component| !matches!(component, Component::Normal(_)))
    {
        return vec![];
    }
    let mut comps = rel.components();
    let first = match comps.next() {
        Some(std::path::Component::Normal(s)) => s.to_owned(),
        _ => return vec![],
    };
    let rest = comps.as_path(); // the path under the dropped folder ("folder 2/New ….txt")

    let mut out = Vec::new();
    for root in watched {
        let Ok(canonical_root) = std::fs::canonicalize(root) else {
            continue;
        };
        // 1. Watched root IS the dropped folder.
        let root_target = root.join(rest);
        if root.file_name() == Some(first.as_os_str())
            && std::fs::canonicalize(&root_target)
                .map(|target| target.starts_with(&canonical_root))
                .unwrap_or(false)
        {
            out.push(root.clone());
            continue;
        }
        // 2. Dropped folder sits directly inside the watched root.
        let candidate = root.join(&first);
        let Ok(canonical_candidate) = std::fs::canonicalize(&candidate) else {
            continue;
        };
        if canonical_candidate.starts_with(&canonical_root)
            && canonical_candidate.is_dir()
            && std::fs::canonicalize(candidate.join(rest))
                .map(|target| target.starts_with(&canonical_candidate))
                .unwrap_or(false)
        {
            out.push(candidate);
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn setup_temp_tree() -> TempDir {
        let dir = tempfile::tempdir().expect("tempdir");
        fs::create_dir_all(dir.path().join("sub")).unwrap();
        fs::write(dir.path().join("hello.txt"), b"hello world").unwrap();
        fs::write(dir.path().join("sub").join("hello.txt"), b"hi").unwrap();
        dir
    }

    #[test]
    fn test_find_file_by_name_and_size() {
        let dir = setup_temp_tree();
        let watched = vec![dir.path().to_path_buf()];
        let results = find_file("hello.txt", 11, &watched); // "hello world" = 11 bytes
        assert_eq!(results.matches.len(), 1);
        assert_eq!(results.matches[0], dir.path().join("hello.txt"));
        assert!(!results.truncated);
    }

    #[test]
    fn test_find_file_wrong_size_excluded() {
        let dir = setup_temp_tree();
        let watched = vec![dir.path().to_path_buf()];
        let results = find_file("hello.txt", 999, &watched);
        assert!(results.matches.is_empty());
    }

    #[test]
    fn test_find_folder_match() {
        let dir = setup_temp_tree();
        let watched = vec![dir.path().to_path_buf()];
        // "sub/hello.txt" exists under the watched root
        let results = find_folder("sub/hello.txt", &watched);
        assert_eq!(results.len(), 1);
    }

    #[test]
    fn test_find_folder_when_watched_root_is_the_dropped_folder() {
        // Watched folder == the dropped folder: webkitRelativePath starts with the folder's OWN name.
        let dir = setup_temp_tree();
        let watched = vec![dir.path().to_path_buf()];
        let base = dir
            .path()
            .file_name()
            .unwrap()
            .to_string_lossy()
            .into_owned();
        let rel = format!("{base}/sub/hello.txt");
        let results = find_folder(&rel, &watched);
        assert_eq!(results.len(), 1);
        assert_eq!(
            results[0],
            dir.path().to_path_buf(),
            "returns the dropped folder's own abs path"
        );
    }

    #[test]
    fn test_find_folder_when_dropped_inside_watched_root() {
        // Watched folder is the PARENT; the dropped folder "sub" lives directly inside it.
        let dir = setup_temp_tree();
        let watched = vec![dir.path().to_path_buf()];
        let results = find_folder("sub/hello.txt", &watched);
        assert_eq!(results.len(), 1);
        assert_eq!(
            results[0],
            dir.path().join("sub"),
            "returns the dropped folder's abs path (root/sub)"
        );
    }

    #[test]
    fn test_find_folder_no_match() {
        let dir = setup_temp_tree();
        let watched = vec![dir.path().to_path_buf()];
        let results = find_folder("nonexistent/path.txt", &watched);
        assert!(results.is_empty());
    }

    #[test]
    fn test_find_folder_rejects_parent_traversal() {
        let dir = setup_temp_tree();
        let watched = vec![dir.path().to_path_buf()];
        assert!(find_folder("sub/../hello.txt", &watched).is_empty());
    }

    #[test]
    fn test_find_file_stops_at_configured_entry_budget() {
        let dir = setup_temp_tree();
        let watched = vec![dir.path().to_path_buf()];
        let result = find_file_with_limits("missing", 0, &watched, 1, 64, 128);
        assert!(result.truncated);
    }

    #[test]
    fn test_find_file_stops_at_match_budget() {
        let dir = tempfile::tempdir().unwrap();
        for name in ["a", "b", "c"] {
            let sub = dir.path().join(name);
            fs::create_dir(&sub).unwrap();
            fs::write(sub.join("same.txt"), b"x").unwrap();
        }
        let result = find_file_with_limits("same.txt", 1, &[dir.path().to_path_buf()], 100, 64, 2);
        assert_eq!(result.matches.len(), 2);
        assert!(result.truncated);
    }

    #[cfg(unix)]
    #[test]
    fn test_find_file_does_not_follow_directory_symlinks() {
        use std::os::unix::fs::symlink;
        let watched = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        fs::write(outside.path().join("secret.txt"), b"secret").unwrap();
        symlink(outside.path(), watched.path().join("escape")).unwrap();

        let result = find_file("secret.txt", 6, &[watched.path().to_path_buf()]);
        assert!(result.matches.is_empty());
        assert!(!result.truncated);
    }
}
