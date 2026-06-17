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

/// Find all watched roots that contain a sub-path matching `rel_path`.
/// For example, `rel_path = "src/main.rs"` finds every watched dir that has
/// that relative path underneath it.
pub fn find_folder(rel_path: &str, watched: &[PathBuf]) -> Vec<PathBuf> {
    watched
        .iter()
        .filter(|root| root.join(rel_path).exists())
        .cloned()
        .collect()
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
    fn test_find_folder_no_match() {
        let dir = setup_temp_tree();
        let watched = vec![dir.path().to_path_buf()];
        let results = find_folder("nonexistent/path.txt", &watched);
        assert!(results.is_empty());
    }
}
