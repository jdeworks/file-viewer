# Editor Roadmap — INI / .env / .conf

## Current state

- Parser (renderer.js `parseIni`): tolerant of `=` and `:` separators, `#` and `;` comments, quoted values; produces `[{ name, pairs: [{key, value}] }]` — nameless section for pre-header keys; `[section]` headers group subsequent pairs
- Viewer renders via template system (`section.html` / `row.html` + `core/template.js`): section header + key-value table rows, HTML-escaped via `{{slot}}`
- Form editor class exists (form-editor.js): IniFormEditor with collapsible sections, editable key and value text inputs, add/delete row per section, add/delete section, inline section rename, serialize back to `key = value` format. NOTE: this class is present but NOT yet wired into renderer.js — the renderer ships read-only tables only; the form editor is not surfaced. (It does NOT support reorder-sections-by-drag, despite an older roadmap note.)
- ✅ SHIPPED — Export to JSON: `exports.js` (`loadExports` in index.js) converts `[{ name, pairs }]` to a nested JSON object (global keys under `global`, sections as objects) and downloads. TOML export is NOT shipped.

## Viewer enhancements (no write-back needed)

- **Value type inference badges** — scan each value for common patterns and show a small badge: integer, float, boolean (`true`/`false`/`yes`/`no`/`1`/`0`), URL, file path, hex color, comma-list; purely cosmetic in the viewer — S
- **Section jump list** — sticky sidebar or `<select>` dropdown listing all `[section]` names; clicking scrolls the viewer to that section — S
- **Duplicate key detection** — if the same key appears more than once within a section (some INI parsers allow this, others don't), highlight the duplicates with a warning badge — S
- **Env-var interpolation preview** — for `.env` files, values containing `${VAR}` or `$VAR` references can be previewed with their resolved values shown as a tooltip (resolve from the same file's values) — M
- **Search across all sections** — text input that highlights matching keys and values across all sections — S

## In-browser editing (download-on-save)

- **Typed value inputs** — extend form editor: detect boolean values and switch from text input to a checkbox; detect numeric values and use a number input; detect URL values and add a link-open icon beside the text input — M
- **Comment preservation** — current serialize (serializeIni) strips all `#`/`;` comments; add a comment field per key (stored as `{ key, value, comment }`) and serialize as `key = value  # comment` — M
- **Add / remove sections** — the form editor already supports this; surface more prominently in the toolbar as "+ Section" button — S
- **Reorder sections by drag** — drag section headers to reorder; serialize in the new order — M
- ✅ SHIPPED — **Export to JSON** — convert `[{ name, pairs }]` to a nested JSON object (`{ sectionName: { key: value } }`) and download — S (in exports.js; uses `global` for the nameless section)
- **Export to TOML** — same mapping but serialize as TOML `[section]` blocks — S (hand-rolled serializer, no lib needed)
- **Merge / diff two INI files** — drag a second file onto a diff panel; show added/removed/changed keys per section — M

## Full write-back editing (companion required)

- **Live save** — key or value edits debounce (500 ms) and POST to companion; companion rewrites file atomically
- **System config editing** — for files under `/etc/` or system paths, companion can run with elevated permissions (via polkit / sudo) and write back; the browser side is identical

## Shared toolbar / modular note

INI toolbar: View | Form edit | Search | Export (JSON / TOML).
The IniFormEditor class (form-editor.js) shares CSS class names (`ini-section`, `ini-row`, `ini-key`, `ini-val`, `ini-eq`, `ini-arrow`, `ini-pairs`, `ini-section-header`) with the TOML and YAML form editors. These classes are defined in the host stylesheet rather than inline. Consolidate the field-rendering logic into a shared `form-fields.js` (see TOML EDITOR.md) to avoid three near-identical `renderField` implementations.
The INI parser (`parseIni`) is exported and re-used by form-editor.js — this is the right pattern; keep it.
