# Archive (ZIP / JAR / NUPKG / APK / IPA)

> Archive file listing with single-entry extraction, in-browser entry editing, and (planned) repack-and-download.

## Format Details
| Field | Value |
|-------|-------|
| Extensions | `.zip`, `.jar`, `.war`, `.nupkg`, `.apk`, `.ipa`, `.cbz`, `.egg`, `.whl` |
| MIME type | `application/zip`, `application/java-archive`, etc. |
| Binary/Text | Binary container |
| Common use | Distribution packages, source archives, app bundles |

## Capabilities

### View
| Feature | Status | Details |
|---------|--------|---------|
| File listing | ✅ | Name, compressed/uncompressed size, date for all entries |
| Archive tree sidebar | ✅ | Hierarchical tree with folder navigation |
| Open entry | ✅ | Click any entry → full type detection + rendering in viewer |
| Encrypted entries | ⚠️ Partial | Listed with 🔒 icon; content cannot be shown |
| Nested archives | ✅ | Open an inner .zip → its own archive tree |
| Metadata | ✅ | Total files, folders, total size, compression ratio |
| Diff/compare | ❌ | Not supported (binary container) |

### Edit
| Feature | Status | Details |
|---------|--------|---------|
| Edit text entry | ✅ | Open text/code entry → edit in Monaco → stashed in `folderEdits` |
| Navigate back to archive | ✅ | Tree retains edited entry (stashed edit shown on re-open) |
| Edit binary entry | ⚠️ Partial | Image edits tracked in `binaryEdit` state; repack pending |
| Repack archive | 🚧 Planned | Download modified archive with all text + binary edits applied |

### Export
| Feature | Status | Details |
|---------|--------|---------|
| Download original | ✅ | Always available |
| Download modified archive | 🚧 Planned | After editing entries, repack and download new .zip |

## Example Files
- [`sample.zip`](../examples/sample.zip) — small ZIP archive
- [`sample-locked.zip`](../examples/sample-locked.zip) — password-protected (listing only)

## Gaps / Planned Improvements
| Feature | Priority | Notes |
|---------|----------|-------|
| Archive repack (download modified) | **High** | state.binaryEdits + repackZip() in ziplib.js; show ftExportBtn for archives |
| Add files to archive | Medium | Drag new file onto archive tree → add as new entry |
| Password-protected extraction | Low | Prompt for password; decrypt with available JS libs |
| TAR/GZ/BZ2/XZ support | Medium | libarchive.wasm is already vendored — wire up |
| Preview file count/size breakdown | Low | Treemap or pie chart of archive contents by size/type |
