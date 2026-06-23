use std::path::{Path, PathBuf};

/// Walk all watched directories and return every file whose name and byte-size
/// match the given arguments.
pub fn find_file(name: &str, size: u64, watched: &[PathBuf]) -> Vec<PathBuf> {
    let mut results = Vec::new();
    for root in watched {
        walk_for_file(root, name, size, &mut results);
    }
    results
}

fn walk_for_file(dir: &Path, name: &str, size: u64, out: &mut Vec<PathBuf>) {
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            walk_for_file(&path, name, size, out);
        } else if path.file_name().and_then(|n| n.to_str()) == Some(name) {
            if let Ok(meta) = std::fs::metadata(&path) {
                if meta.len() == size {
                    out.push(path);
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
    let mut comps = rel.components();
    let first = match comps.next() {
        Some(std::path::Component::Normal(s)) => s.to_owned(),
        _ => return vec![],
    };
    let rest = comps.as_path(); // the path under the dropped folder ("folder 2/New ….txt")

    let mut out = Vec::new();
    for root in watched {
        // 1. Watched root IS the dropped folder.
        if root.file_name() == Some(first.as_os_str()) && root.join(rest).exists() {
            out.push(root.clone());
            continue;
        }
        // 2. Dropped folder sits directly inside the watched root.
        let candidate = root.join(&first);
        if candidate.join(rest).exists() {
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
        assert_eq!(results.len(), 1);
        assert_eq!(results[0], dir.path().join("hello.txt"));
    }

    #[test]
    fn test_find_file_wrong_size_excluded() {
        let dir = setup_temp_tree();
        let watched = vec![dir.path().to_path_buf()];
        let results = find_file("hello.txt", 999, &watched);
        assert!(results.is_empty());
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
        let base = dir.path().file_name().unwrap().to_string_lossy().into_owned();
        let rel = format!("{base}/sub/hello.txt");
        let results = find_folder(&rel, &watched);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0], dir.path().to_path_buf(), "returns the dropped folder's own abs path");
    }

    #[test]
    fn test_find_folder_when_dropped_inside_watched_root() {
        // Watched folder is the PARENT; the dropped folder "sub" lives directly inside it.
        let dir = setup_temp_tree();
        let watched = vec![dir.path().to_path_buf()];
        let results = find_folder("sub/hello.txt", &watched);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0], dir.path().join("sub"), "returns the dropped folder's abs path (root/sub)");
    }

    #[test]
    fn test_find_folder_no_match() {
        let dir = setup_temp_tree();
        let watched = vec![dir.path().to_path_buf()];
        let results = find_folder("nonexistent/path.txt", &watched);
        assert!(results.is_empty());
    }
}
