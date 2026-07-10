use std::io;
use std::path::{Path, PathBuf};
use tokio::io::AsyncWriteExt;

use crate::atomic_replace::replace_file;

fn temporary_sibling(path: &Path) -> io::Result<PathBuf> {
    let parent = path.parent().ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::InvalidInput,
            "target has no parent directory",
        )
    })?;
    let name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("file");
    Ok(parent.join(format!(".{name}.{}.companion_tmp", uuid::Uuid::new_v4())))
}

/// Write replacement bytes to a unique sibling, sync them, preserve existing permissions, and
/// atomically rename the sibling over the target. Any failed attempt removes its temporary file.
pub async fn atomic_write(path: &Path, bytes: &[u8]) -> io::Result<()> {
    let temp = temporary_sibling(path)?;
    let previous_permissions = tokio::fs::metadata(path)
        .await
        .ok()
        .map(|meta| meta.permissions());

    let result = async {
        let mut file = tokio::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp)
            .await?;
        file.write_all(bytes).await?;
        file.flush().await?;
        file.sync_all().await?;
        drop(file);

        if let Some(permissions) = previous_permissions {
            tokio::fs::set_permissions(&temp, permissions).await?;
        }
        replace_file(&temp, path)
    }
    .await;

    if result.is_err() {
        let _ = tokio::fs::remove_file(&temp).await;
    }
    result
}

#[cfg(test)]
mod tests {
    use super::atomic_write;

    #[tokio::test]
    async fn replaces_content_without_leaving_a_temp_file() {
        let tmp = tempfile::tempdir().unwrap();
        let target = tmp.path().join("note.txt");
        tokio::fs::write(&target, b"old").await.unwrap();

        atomic_write(&target, b"replacement").await.unwrap();

        assert_eq!(tokio::fs::read(&target).await.unwrap(), b"replacement");
        assert!(!std::fs::read_dir(tmp.path())
            .unwrap()
            .flatten()
            .any(|entry| entry
                .file_name()
                .to_string_lossy()
                .ends_with(".companion_tmp")));
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn preserves_existing_unix_permissions() {
        use std::os::unix::fs::PermissionsExt;
        let tmp = tempfile::tempdir().unwrap();
        let target = tmp.path().join("script.sh");
        tokio::fs::write(&target, b"old").await.unwrap();
        tokio::fs::set_permissions(&target, std::fs::Permissions::from_mode(0o751))
            .await
            .unwrap();

        atomic_write(&target, b"new").await.unwrap();

        assert_eq!(
            std::fs::metadata(target).unwrap().permissions().mode() & 0o777,
            0o751
        );
    }
}
