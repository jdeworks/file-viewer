# Editor Roadmap — Archive (7z / RAR / TAR / TAR.GZ / TGZ / TAR.BZ2 / TBZ2 / TAR.XZ / TXZ / TAR.ZST)

## Current state
Flat file listing via `core/archivelib.js` (libarchive.wasm, ~1 MB, opt-in behind `enableArchiveWasm` setting). Renders an alphabetically sorted name + size table using shared `zip-doc` / `zip-table` CSS. No entry extraction or preview. The archive renderer and zip renderer share the same CSS class namespace.

## Viewer enhancements (no write-back needed)
- **Recursive tree view** — parse entry paths into a folder tree; render as a collapsible tree (folders expand/collapse) instead of a flat list. — M
- **File search / filter** — text input above the table that filters visible rows by filename substring in real time. — S
- **Size treemap** — visualise relative file sizes as a proportional rectangle treemap (d3-hierarchy's `treemap` layout, or a lightweight hand-rolled version). Useful for large archives. — M — d3-hierarchy or custom
- **Entry preview on click** — extract a single entry via libarchive.wasm and route its bytes through the normal type-detection pipeline (mirrors the ZIP `openEntry` pattern). — M — libarchive.wasm
- **Compression ratio column** — show compressed size alongside uncompressed size when the format exposes it (libarchive provides both). — S
- **Sort by column** — click column headers to sort by name, size, or date ascending/descending. — S

## In-browser editing (download-on-save)
- **Delete entries + repack as ZIP** — select entries via checkboxes, extract the rest via libarchive.wasm, repack into a new ZIP using JSZip (already vendored at `docs/vendor/jszip/`), offer download. Cross-format: always outputs ZIP regardless of input format. — L — libarchive.wasm + JSZip
- **Add files via drag-and-drop** — accept dropped files, extract the existing archive, add the new files, repack as ZIP and download. — L — libarchive.wasm + JSZip
- **Rename entries** — inline rename of entry names in the listing before repacking; applies on download. — M — libarchive.wasm + JSZip
- **TAR repack** — repack as `.tar.gz` instead of ZIP. TAR construction is straightforward (512-byte header blocks); gzip via native `CompressionStream` API (no lib needed). — L

## Full write-back editing (companion required)
- **Write repacked archive back to original path** — after delete/add/rename, save the new ZIP or TAR directly to the source file path via the companion write-back API.
- **Extract all to directory** — extract every entry into a sibling directory on the local filesystem. Requires companion to create directories and write individual files.

## Shared toolbar / modular note
The archive and zip renderers share CSS. Any repack workflow should live in a shared `core/repack.js` module (libarchive extract → JSZip pack → download) so both types can import it. The `enableArchiveWasm` opt-in gate should also cover the heavier repack operations. Entry preview reuses the same `openEntry` / `intakeFromBytes` pattern already implemented in zip/renderer.js.
