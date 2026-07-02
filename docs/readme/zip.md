# Archive (ZIP / JAR / NUPKG / APK / IPA)

> Archive file listing with single-entry extraction, archive tree navigation, password-protected ZIP handling, edited-archive export, and CSV listing export.

## Format Details
| Field | Value |
|-------|-------|
| Extensions | `.zip`, `.jar`, `.war`, `.nupkg`, `.apk`, `.cbz`, `.whl`; ZIP magic fallback for misnamed archives |
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
| Encrypted entries | ⚠️ Partial | ZipCrypto entries can be unlocked locally; AES-encrypted entries are listed but unsupported |
| Password tools | ⚠️ Partial | Manual password, candidate list, and bounded brute-force UI run locally for ZipCrypto entries |
| Nested archives | ✅ | Open an inner .zip → its own archive tree |
| Metadata | ✅ | Container, file/folder counts, sizes, compression, methods, image count, newest entry, encryption, risky entry names |
| Diff/compare | ❌ | Not supported (binary container) |

### Edit
| Feature | Status | Details |
|---------|--------|---------|
| Edit text entry | ✅ | Open text/code entry → edit in Monaco → stashed in `folderEdits` |
| Navigate back to archive | ✅ | Tree retains edited entry (stashed edit shown on re-open) |
| Edit binary entry | ⚠️ Partial | Image edits tracked in `binaryEdit` state; repack pending |
| Repack archive | ✅ | Download modified archive with text edits, binary edits, moves/deletions handled by the archive export path |

### Export
| Feature | Status | Details |
|---------|--------|---------|
| Download original | ✅ | Always available |
| Download modified archive | ✅ | After editing entries, repack and download new `.zip` |
| Export file listing as CSV | ✅ | Export menu writes name, size, packed size, modified date, and comment |

## Example Files
- [`sample.zip`](../examples/sample.zip) — small ZIP archive
- [`sample-locked.zip`](../examples/sample-locked.zip) — password-protected (listing only)

## Gaps / Planned Improvements
| Feature | Priority | Notes |
|---------|----------|-------|
| Add files to archive | Medium | Drag new file onto archive tree → add as new entry |
| AES-encrypted extraction | Low | Current local unlock support is ZipCrypto-only |
| TAR/GZ/BZ2/XZ support | Medium | libarchive.wasm is already vendored — wire up |
| Preview file count/size breakdown | Low | Treemap or pie chart of archive contents by size/type |
