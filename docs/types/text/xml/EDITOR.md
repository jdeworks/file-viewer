# Editor Roadmap — XML

## Current state

- Collapsible element tree via `<details>`/`<summary>` (renderer.js); attributes shown inline with `@key=value` style; direct text content displayed; uses shared JSON tree CSS (`j-node`, `j-row`, `j-key`, `j-str`); platform `DOMParser` — no external lib
- Semantic element-path diff via xmldiff.js + core/treediff.js (parallel to jsondiff.js)
- Export: XML → JSON (recursive element-to-object mapping, attributes prefixed `@`, text content as `#text`) via exports.js

## Viewer enhancements (no write-back needed)

- **XPath query panel** — text input accepts an XPath 1.0 expression; evaluated with `document.evaluate()` (browser-native, no lib needed); matching nodes are highlighted in the tree and listed in a results panel with their text content — M
- **Namespace map** — parse the root element's `xmlns:*` attributes and display a small badge list showing prefix → URI; click a prefix to filter the tree to only that namespace — S
- **Attribute inspector** — clicking any element in the tree opens a side panel listing all its attributes as editable key-value rows (viewer-only: copy-to-clipboard per attribute) — S
- **Collapse to depth** — slider or button group (1 / 2 / 3 / all) that collapses `<details>` nodes beyond the selected depth; useful for large documents — S
- **Pretty-print source** — a "Formatted" tab that re-serializes the parsed DOM with `XMLSerializer` and runs it through a simple indent formatter, so poorly-formatted XML becomes readable without leaving the viewer — S
- **XSD schema stats** — if the file is an XSD, detect `xs:element` / `xs:complexType` nodes and show a summary: element count, type count, namespace target — S (XSD files only)

## In-browser editing (download-on-save)

- **XSLT transform** — user pastes or drops an XSL stylesheet; the browser's native `XSLTProcessor` applies it to the current document and shows the output (HTML or XML) in a result panel; output can be downloaded — M (no external lib, browser API only)
- **Pretty-print / minify** — toolbar toggle: serialize the parsed DOM via `XMLSerializer`, indent with a simple recursive formatter, then offer "Download formatted XML" or "Download minified XML" — S
- **XML → JSON export** — already exists in exports.js; surface it as a prominent toolbar button rather than only in the exports dropdown — S
- **Inline attribute editing** — build an editor pane where element attributes are shown as `key="value"` input fields; mutating them updates the in-memory DOM; serialize with `XMLSerializer` on save — L
- **XSD validation** — accept an XSD drop; validate using `xsd-schema-validator` (WASM-based, ~500 KB) and annotate tree nodes with pass/fail; highlight the first failing element — L — lib: `xsd-schema-validator` or `libxml2.wasm`

## Full write-back editing (companion required)

- **Live DOM editing** — inline add/remove elements and attributes; companion writes the file through `XMLSerializer` output
- **Large-document virtual tree** — for files over 1 MB, stream-parse with a SAX-like approach (via companion proxy) and render only the visible tree viewport

## Shared toolbar / modular note

XML toolbar: Tree | XPath query | XSLT | Format | Minify | Export (JSON).
The XPath query panel is architecturally similar to the JSONPath filter planned for JSON — consider a shared `query-panel.js` that takes `{ label, placeholder, run(text, expr) → ResultList }` and renders the common input + result list UI. XML and JSON both plug in their own engine.
`XMLSerializer` and `DOMParser` are zero-cost browser APIs — prefer them over bundled XML libs for formatting and serialization tasks.
