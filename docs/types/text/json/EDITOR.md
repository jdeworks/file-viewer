# Editor Roadmap — JSON

## Current state

- Collapsible tree viewer via `<details>`/`<summary>` (renderer.js); key sort A-Z/Z-A/original via settings
- JSONC recovery (strips `//` and `/* */` comments before parse) via jsonparse.js
- Semantic key-path diff against saved/original via jsondiff.js + core/treediff.js
- Exports: CSV, YAML (js-yaml), pretty JSON, minified JSON (exports.js)
- Raw text pane (editable) and raw diff always available through the core layer

## Viewer enhancements (no write-back needed)

- **JSONPath filter** — text input runs a JSONPath expression (e.g. `$.store.book[*].author`) against the parsed document and highlights / lists matching nodes in the tree; no write required — S — lib: `jsonpath-plus` (bundle ~30 KB, already MIT)
- **jq-style filter preview** — run a jq-subset expression using `jq-web` (WASM port) and show the filtered output as a secondary tree panel alongside the original — M — lib: `jq-web` (~1 MB WASM, lazy-loaded)
- **Schema validation overlay** — accept a JSON Schema (paste or drop), validate the document with `ajv`, and annotate tree nodes with green tick / red cross badges; errors panel lists path + message — M — lib: `ajv` (~80 KB)
- **Key-path breadcrumb** — clicking any tree node copies its dot-path to clipboard and shows a breadcrumb bar at the top of the tree — S
- **Collapse-all / expand-all toolbar** — two buttons that open/close all `<details>` nodes; persist depth preference in settings — S
- **Value search / highlight** — live text search that highlights matching keys and values across the tree; scrolls to first match, Ctrl+G cycles — S

## In-browser editing (download-on-save)

- **Form editing from JSON Schema** — if a `$schema` key is present (or user drops a schema file), render a form with typed inputs per property (string, number, boolean, enum dropdowns, array item rows); serialize back to pretty JSON on save — L — lib: `@rjsf/core` is React-based, avoid; instead build a lightweight recursive form renderer similar to the existing YAML form editor (yaml/form-editor.js), re-using TOML field renderers
- **Pretty-print / minify / sort-keys toggle** — toolbar buttons that reformat the raw source text in the edit pane and update the tree view live; sort-keys already exists as a view setting but reformatting the source is the editing action — S
- **Add / edit / delete nodes** — tree nodes get inline edit icons: pencil (edit scalar value in a popover input), plus (add child key or array item), trash (delete); mutations serialize back via `JSON.stringify(…, null, 2)` — L
- **Diff two JSON files** — drag-and-drop a second JSON file onto the diff panel; the semantic diff (jsondiff.js) already works against the original; extend the UI to accept a second arbitrary file as the "right" side — M

## Full write-back editing (companion required)

- **Live auto-save on keypress** — raw textarea changes debounce (500 ms) and POST to the companion Axum endpoint; companion writes atomically (temp file + rename)
- **Conflict detection** — companion watches the file with `notify`; if the file changes on disk while the editor is open, show a merge banner with a three-way diff (original / theirs / yours)
- **Schema-pinning** — companion stores a per-file `.schema.json` sidecar so the schema validation overlay reloads automatically on next open

## Shared toolbar / modular note

The JSON toolbar should expose: Sort keys | Validate | Filter (JSONPath) | Format | Minify | Diff.
The form editor and tree editor share the parsed document object — keep a single `parsed` signal so either pane can mutate it and both views re-render.
The JSONPath / jq filter panel is a good candidate for a shared `query-panel` module reused by YAML, JSONL, and XML (XPath) — same UI shell, swappable engine.
