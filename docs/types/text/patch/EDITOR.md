# Editor Roadmap — Patch / Unified Diff

## Current state

Colorised diff viewer: classifies each line as `p-file` (file header), `p-hunk` (@@), `p-add` (+), or `p-del` (-); renders via inline JS template strings in `renderer.js` (no separate `.html` template files for this type). Per-hunk include/exclude checkboxes rebuild a filtered patch (selected hunks only) into a copyable readonly textarea. `patchStats()` extracts added/removed/file/hunk/new-file/deleted-file/rename counts for the metadata panel. Pure presentation — no patching logic. Returns `{ bodyHtml }`.

## Viewer enhancements (no write-back needed)

- **Split diff view** — render a side-by-side diff (old | new) using a pure-JS diff-to-split-view transform; align unchanged context lines on both sides, highlight word-level changes within lines using a character diff — L (diff2html ~50 KB or custom)
- **Hunk navigation** — add a fixed jump-bar with Previous/Next hunk buttons (keyboard: `[` and `]`) that scroll to the nearest `@@` boundary — S
- **Include/exclude hunks UI** — render a checkbox next to each hunk header; a "Download selected hunks" button reconstructs a valid partial patch containing only checked hunks — M
- **Stat summary bar** — visual stacked bar chart (green adds, red deletes) at the top, similar to GitHub's patch stat view; derived from existing `patchStats()` — S
- **File jump list** — sidebar or dropdown listing each `diff --git` file in the patch; clicking jumps to that file's section — S

## In-browser editing (download-on-save)

- **Apply-patch simulation** — accept a second uploaded file (the original); apply the patch client-side using a JS patch library (diff npm package compiled to ESM, ~30 KB); render the patched result in a third pane; download the result — L (diff/patch ESM or hand-rolled apply loop)
- **Hunk editor** — allow reordering or deleting individual hunks via drag-and-drop; reconstruct a syntactically valid patch on each change; Ctrl+S downloads the edited patch — L
- **Fuzz tolerance control** — slider for fuzzy matching offset when applying; show which hunks succeeded vs. failed at the chosen fuzz level — M
- **Monaco raw edit mode** — fall back to Monaco with `language: 'diff'` (built-in grammar) for direct text editing of the patch file; Ctrl+S downloads — S (Monaco already vendored)

## Full write-back editing (companion required)

- **Apply to working tree** — companion applies the patch with `git apply` or `patch -p1` against the actual file tree; reports hunk-level success/failure — M
- **Reverse patch** — companion runs `patch -R`; result streamed back — S

## Shared toolbar / modular note

The hunk include/exclude checkbox feature and the apply-patch simulation are the two highest-value increments here — both are viewer-side only (no write-back needed). diff2html (MIT, ~50 KB min+gz) provides both the split-view renderer and a solid HTML output; evaluate it against a hand-rolled split view given the project's no-CDN constraint (would need vendoring). The Monaco `diff` language grammar gives free syntax colouring for raw editing at zero additional cost.
