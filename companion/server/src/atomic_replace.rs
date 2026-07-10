use std::io;
use std::path::Path;

#[cfg(not(windows))]
pub fn replace_file(source: &Path, destination: &Path) -> io::Result<()> {
    std::fs::rename(source, destination)
}

#[cfg(windows)]
pub fn replace_file(source: &Path, destination: &Path) -> io::Result<()> {
    use std::iter;
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{
        MoveFileExW, ReplaceFileW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH,
        REPLACEFILE_WRITE_THROUGH,
    };

    fn wide(path: &Path) -> Vec<u16> {
        path.as_os_str()
            .encode_wide()
            .chain(iter::once(0))
            .collect()
    }

    let source = wide(source);
    let destination_wide = wide(destination);
    let replaced = if destination.exists() {
        // ReplaceFileW retains the destination's metadata/ACL where possible while swapping in the
        // already-synced sibling. This is the Windows equivalent of Unix rename-over-existing.
        unsafe {
            ReplaceFileW(
                destination_wide.as_ptr(),
                source.as_ptr(),
                std::ptr::null(),
                REPLACEFILE_WRITE_THROUGH,
                std::ptr::null(),
                std::ptr::null(),
            )
        }
    } else {
        // REPLACE_EXISTING also closes the race where another process creates the destination after
        // the existence check. Both paths remain same-volume because the source is a sibling.
        unsafe {
            MoveFileExW(
                source.as_ptr(),
                destination_wide.as_ptr(),
                MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
            )
        }
    };

    if replaced == 0 {
        Err(io::Error::last_os_error())
    } else {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::replace_file;

    #[test]
    fn replaces_an_existing_destination_and_consumes_the_source() {
        let tmp = tempfile::tempdir().unwrap();
        let source = tmp.path().join("replacement.tmp");
        let destination = tmp.path().join("document.txt");
        std::fs::write(&source, b"new bytes").unwrap();
        std::fs::write(&destination, b"old bytes").unwrap();

        replace_file(&source, &destination).unwrap();

        assert_eq!(std::fs::read(&destination).unwrap(), b"new bytes");
        assert!(!source.exists());
    }

    #[test]
    fn failed_replacement_leaves_source_and_destination_intact() {
        let tmp = tempfile::tempdir().unwrap();
        let source = tmp.path().join("replacement.tmp");
        let destination = tmp.path().join("destination-dir");
        std::fs::write(&source, b"new bytes").unwrap();
        std::fs::create_dir(&destination).unwrap();

        assert!(replace_file(&source, &destination).is_err());

        assert_eq!(std::fs::read(&source).unwrap(), b"new bytes");
        assert!(destination.is_dir());
    }
}
