# Editor Roadmap — ZIP Archive

## Current state
Rich ZIP viewer: reads the central directory (no full decompression), shows name, uncompressed size, compressed size, date, and compression ratio. Entries are clickable — JSZip extracts individual files and routes them through type detection (`openEntry` + `intakeFromBytes`). Handles password-protected ZIPs gracefully (password prompt UI, honest "JSZip cannot decrypt" message, lock icons per entry). Partially encrypted ZIPs show a mixed banner. Exposes `archiveTree` for the parent to build a tree view. Export (exports.js): "Export file listing as CSV" downloads a CSV of every entry (name, size, compressed size, date modified, comment).

## Viewer enhancements (no write-back needed)
- **Recursive folder tree view** — render the flat entry list as a collapsible folder tree (parse path separators). The renderer's own table listing is still flat, but the renderer already exposes `archiveTree` (entries with name/size/dir/encrypted) so the **parent app builds a folder tree from that data**; remaining work is an in-renderer tree fallback for when the parent host is absent. — M
- **File search / filter** — text input above the table; filters the rendered rows by filename substring in real time. — S
- **Size treemap** — proportional rectangle treemap of uncompressed entry sizes (d3-hierarchy or hand-rolled). Useful for inspecting large ZIPs. — M — d3-hierarchy
- **Sort by column** — click Name / Size / Packed / Date column headers to sort. — S
- **Inline preview pane** — clicking an entry opens a split-pane preview (rendered via the normal type pipeline) without navigating away from the ZIP listing. — M

## In-browser editing (download-on-save)
- **Delete files + repack** — checkboxes on each row; a "Delete selected & download" button extracts remaining entries via JSZip and repacks into a new ZIP blob for download. JSZip is already vendored at `docs/vendor/jszip/`. — M — JSZip (docs/vendor/jszip/)
- **Add files via drag-and-drop** — accept files dropped onto the listing; load the existing ZIP, add the new files, download the merged ZIP. — M — JSZip
- **Rename entries** — inline rename input per row (click the name cell to edit); applies on repack/download. — M — JSZip
- **Change compression level** — a `<select>` (Store / Fast / Default / Max) wired to JSZip's `compression` + `compressionOptions.level` parameters when repacking. — S — JSZip

## Full write-back editing (companion required)
- **Save modified ZIP back to original file** — write the repacked ZIP blob to the original path via the companion write-back API instead of triggering a download.
- **Watch for external changes** — companion file-watch integration: reload the ZIP listing if the file changes on disk.

## Shared toolbar / modular note
ZIP editing shares the repack workflow with the archive renderer (`archive/EDITOR.md`). Consider a shared `core/repack.js` (JSZip-based) so both types import the same logic. The existing `ziplib.js` sibling module already handles reading; a new `ziplib-write.js` (or extension of the existing file) can own the repack path. Keep the `openEntry` bridge intact — the edit UI sits alongside the existing listing rather than replacing it.
