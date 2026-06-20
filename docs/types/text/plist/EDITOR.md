# Editor Roadmap — plist

## Current state

- Viewer (renderer.js, ~8 KB): XML plist parsed via platform `DOMParser`; binary plist (`bplist00` magic) detected and shown as a "binary format not supported" notice with `plutil` conversion hint
- Custom recursive renderer with collapsible `▾` / `▸` expand keys (JS click handler toggling `.hidden` on sibling `.pl-children` div); all PLIST types handled: string, integer, real, true, false, date (ISO 8601 → `toLocaleString`), data (truncated hex preview), array, dict
- Footer shows root type, top-level key/item count, max nesting depth
- Inline `<style>` block with dark-mode support (`body.fv-dark`)
- No form editor, no exports

## Viewer enhancements (no write-back needed)

- **Collapse-to-depth control** — slider or button strip (1 / 2 / 3 / all) to collapse all dict/array nodes beyond a chosen depth; uses the existing `.pl-key` click mechanism — S
- **Key search / highlight** — text input that highlights matching dict keys across the tree and scrolls to first match — S
- **Date formatting toggle** — switch between locale string, ISO 8601, and Unix timestamp for `<date>` nodes; no re-parse needed, just reformat the displayed text — S
- **Data node hex viewer** — clicking a `<data>` node currently shows a truncated preview; expand it into a hex dump panel (16 bytes per row, offset + hex + ASCII columns) — M
- **Root type / schema summary** — already shows root type and depth in footer; extend to list all distinct key names in any top-level dicts with their value types — S

## In-browser editing (download-on-save)

- **Scalar value editing** — inline edit for string, integer, real, and boolean leaf nodes: click value → popover input; on confirm, update the in-memory parsed object and re-serialize to XML plist; serialize using `XMLSerializer` on the parsed `DOMParser` document (mutate the text node / element in place) — M
- **XML plist pretty-print download** — "Download formatted plist" button; re-serialize the parsed DOM with an indent formatter and download as `.plist` — S
- **Export to JSON** — convert the parsed JS object (already fully parsed in `plistToValue`) to `JSON.stringify(…, null, 2)` and download — S
- **Export to YAML** — same parsed object → `jsyaml.dump` → download `.yaml` — S — lib: `js-yaml` (already vendored)

## Full write-back editing (companion required)

- **Binary plist write-back** — companion can shell out to `plutil -convert binary1` after editing in XML mode, so the file on disk stays in binary format if that is what the original was
- **Live save** — post XML text to companion on every edit; companion writes atomically

## Shared toolbar / modular note

plist toolbar: Tree | Search | Export (JSON / YAML / formatted plist).
The JS-object-to-tree rendering in renderer.js (`renderValue`) is a custom implementation rather than reusing the shared JSON tree CSS (`j-node` / `j-row`). A future cleanup could unify them; for now the `pl-*` class namespace is self-contained and carries its own inline styles, which is unusual for this project (most renderers rely on the host CSS). If the viewer moves to `bodyHtml` without inline `<style>`, it should adopt the `j-*` classes or a new shared set.
