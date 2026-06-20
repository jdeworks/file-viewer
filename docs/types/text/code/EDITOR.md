# Editor Roadmap — Code (Generic Source Code)

## Current state

Read-only Monaco Editor view is already wired via `syntaxLanguage()` in `index.js` — Monaco 0.52.2 is vendored at `docs/vendor/monaco/`. The `capabilities.diff = true` flag enables the built-in Monaco diff view. Metadata panel extracts LOC, complexity, TODO markers, imports, and largest/most-complex functions via `metrics.js`.

## Viewer enhancements (no write-back needed)

- **Minimap + sticky scroll** — enable Monaco `minimap.enabled` and `stickyScroll.enabled` options in the editor mount so large files get a birds-eye scrollbar and scope breadcrumbs — S
- **Symbol outline panel** — use Monaco's built-in `DocumentSymbolProvider` (already available for JS/TS/Python via language workers) to render a collapsible outline sidebar: classes → methods → functions — M
- **Go-to-definition stub** — wire Monaco's peek-definition action; for file-local symbols resolve within the single file; show "external — not available offline" for imports — M
- **Codelens badges** — `codelens.js` already exists; surface complexity score and LOC above each function using Monaco's `CodeLensProvider` API — M
- **Inline TODO highlighting** — register a Monaco `DocumentHighlightProvider` that marks `TODO`/`FIXME`/`XXX` and lists them in a gutter widget — S
- **Heatmap gutter** — colour the gutter by cyclomatic complexity per function (green → red) using Monaco's line-decoration API — M

## In-browser editing (download-on-save)

- **Full Monaco editor mode** — switch `readOnly: false`, wire Ctrl+S / Cmd+S to `Blob` download; re-use the vendored Monaco already loaded for viewing — S
- **Prettier in-browser format** — load Prettier ESM build for JS/TS/CSS/HTML/JSON from CDN or vendor; bind to a toolbar "Format" button — M (Prettier ESM, ~400 KB gzipped)
- **Multi-cursor find/replace** — expose Monaco's built-in find widget (Ctrl+H) and multi-cursor add (Alt+Click); already built into Monaco, just needs `readOnly: false` — S
- **Language mode switcher** — dropdown listing all languages in `langmap.js`; calls `monaco.editor.setModelLanguage()` to re-tokenise on demand — S
- **Tab/space/indent toggle** — toolbar controls that call `editor.getModel().updateOptions({ tabSize, insertSpaces })` — S

## Full write-back editing (companion required)

- **Auto-save on change** — debounced POST to companion `/write` endpoint; show dirty indicator in tab title — S
- **Live reload on external change** — companion file-watch event triggers `editor.getModel().setValue()` without losing cursor position — M
- **Multi-file project view** — file-tree sidebar listing sibling files; open each in a Monaco tab (using `monaco.editor.createModel`) — L

## Shared toolbar / modular note

Monaco is already vendored; all in-browser editing work is zero additional vendor cost. The `codelens.js` file is a natural home for complexity badges — keep provider registration there and import from a future `editor-mode.js` that activates when `readOnly` is toggled off. Prettier should be dynamically imported only when the Format button is clicked to avoid cold-load cost.
