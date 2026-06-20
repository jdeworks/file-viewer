# Editor Roadmap — TOML

## Current state

- Collapsible tree viewer (renderer.js); reuses JSON tree CSS; hand-rolled parser (toml.js, ~7.6 KB) supporting scalars, arrays, inline tables, `[section]` headers, `[[array-of-tables]]`, Date/datetime values
- Form editor (form-editor.js, ~12 KB): globals (pre-section keys) + `[section]` groups + `[[array-of-tables]]` items; typed inputs: checkbox (bool), number, text/textarea (string), datetime-local (ISO dates), comma-separated text (scalar arrays), read-only code badge (complex values); collapsible sections; serialize back to TOML text; save → blob download
- Exports: JSON and YAML downloads (exports.js, hand-rolled YAML serializer — no external lib needed)

## Viewer enhancements (no write-back needed)

- **Syntax check panel** — run `parseTOML()` on every keystroke in the raw pane and show a compact error bar (line, column, message) without blocking the rest of the view; the parser already throws on invalid input — S
- **TOML → JSON toggle** — button renders the parsed object as pretty-printed JSON in a secondary panel; already possible with `JSON.stringify(parseTOML(text), null, 2)` — S
- **Section jump list** — sidebar or dropdown listing all `[section]` and `[[array-of-tables]]` headers; clicking scrolls the form or raw pane to that section — S
- **Type annotation badges** — in the tree view, show the TOML type beside each value: string / integer / float / bool / datetime / date / time / array / inline-table; the parser already distinguishes these — S

## In-browser editing (download-on-save)

- **Array-of-tables row editing** — the form editor renders `[[aot]]` items but does not currently allow adding or removing rows; add +/- row buttons to array-of-tables sections — M
- **Add new key to section** — each section footer gets an "+ Add key" row that inserts a blank `key = ""` line; the parser re-reads on next save — M
- **Rename / reorder sections** — drag section headers to reorder; rename via double-click on section title; serialize preserves the new order — M
- **TOML → YAML save** — "Save as YAML" button (already in exports.js, surface in form editor toolbar) — S
- **Inline table editor** — values detected as inline tables (`{a = 1, b = 2}`) currently show as read-only; add a pencil icon that opens a small key-value popover for editing them — M

## Full write-back editing (companion required)

- **Live save** — form field changes debounce (500 ms) and POST serialized TOML to companion; companion writes atomically
- **Comment preservation** — the hand-rolled parser strips comments; companion mode can switch to `@iarna/toml` which preserves AST positions; serialize back using the library's formatter to keep user comments intact

## Shared toolbar / modular note

TOML toolbar: Tree | Form | Validate | TOML→JSON | TOML→YAML.
The form-editor.js field rendering functions (`renderField`, `renderSection`) are near-identical copies of the ones in yaml/form-editor.js. Both use class names from the `ini-*` / `toml-*` CSS namespaces. Refactor into a shared `form-fields.js` helper (input creation, type dispatch, label + value layout) and import from both. The INI editor (ini/form-editor.js) would also benefit from this consolidation.
