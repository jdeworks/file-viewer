# Archive (7z / RAR / tar)

> Archive listing for 7z, RAR, tar, tar.gz, tar.bz2, and tar.xz — file names, sizes, and directory structure decoded client-side via WASM.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.7z`, `.rar`, `.tar`, `.tar.gz`, `.tgz`, `.tar.bz2`, `.tbz2`, `.tar.xz`, `.txz` |
| MIME type | `application/x-7z-compressed`, `application/x-rar-compressed`, `application/x-tar` |
| Binary / Text | Binary |
| Common use | Source code distribution, backup archives, software packages |

> **Note:** ZIP archives use a separate, more capable `zip` type with entry browsing and content editing. See [zip.md](zip.md).

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| File listing | ✅ | Name, size, directory/file indicator; alphabetically sorted |
| Stats summary | ✅ | Total file count, folder count, total uncompressed size |
| WASM decoder | ✅ | `archivelib.js` uses a WASM archive reader; opt-in via Settings |
| Opt-in prompt | ✅ | When `enableArchiveWasm` is off, shows an informational prompt |
| Source view | ❌ | Binary format — no raw text view |
| Diff | ❌ | Binary format not diffable |
| Entry content preview | ❌ | Cannot open individual entries (ZIP only) |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Archive editing | ❌ | Not implemented for these formats |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Re-pack with edits | ❌ | Only ZIP supports repack |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Archive support | Off | Enable WASM decoder for 7z/RAR/tar (~1 MB download, cached) |

## Real-World Examples

- [`sample.tar.gz`](../examples/sample.tar.gz) — example tarball

## Known Limitations

- Password-protected archives cannot be listed (no decryption)
- `enableArchiveWasm` setting must be turned on in Settings → Advanced on first use (~1 MB WASM download)
- Entry content cannot be previewed (no entry-level navigation like ZIP)

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Entry content preview | High | Hard | Navigate into entries like the ZIP tree browser |
| Password-protected listing | Low | Hard | User-provided password to decrypt and list |
| Archive format detection improvement | Low | Easy | Detect tar sub-formats by magic bytes |
