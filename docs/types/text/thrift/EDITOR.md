# Editor Roadmap — Thrift (Apache Thrift IDL)

## Current state

Rich structured viewer: parses `namespace` (per-language), `include`, `typedef`, `enum`, `struct`, `exception`, and `service` (with method signatures including `throws`). Renders colour-coded section cards with field/method tables. Returns `{ parentNode }`. Monaco has no built-in Thrift grammar; no editor mode wired.

## Viewer enhancements (no write-back needed)

- **Schema diagram** — SVG graph: struct/exception boxes with field rows, service boxes with method nodes, arrows from method params/return types back to structs — L (manual SVG or elkjs)
- **Field ID gap and duplicate check** — scan each struct for non-contiguous or duplicate field IDs; surface warnings inline in the field table rows — S
- **Stub code preview** — generate illustrative stubs (Python, Java, Go style) from the parsed `services` and `structs`; collapsible panel per service — M
- **Namespace pills as copy buttons** — clicking a namespace pill copies the namespace string to clipboard; useful for referencing in code — S
- **Monaco syntax highlight** — no built-in Thrift grammar in Monaco; register a minimal TextMate-style token provider for keywords (`struct`, `service`, `enum`, `required`, `optional`, `throws`, `namespace`), string literals, and line/block comments — M

## In-browser editing (download-on-save)

- **Monaco editor mode** — mount Monaco with the custom Thrift token provider; Ctrl+S triggers Blob download; live re-parse drives the structured panel in a split view — M (Monaco already vendored)
- **Field ID auto-complete** — `CompletionItemProvider` suggests the next unused field ID when the cursor is after `:` inside a struct body — S
- **Format on save** — normalise indentation, align `=` in enum values, strip trailing whitespace; pure string transform — M
- **Namespace generator** — toolbar dialog: enter language targets (java, py, go, cpp, js) and a base namespace string; inserts the correct `namespace` lines at the top — S

## Full write-back editing (companion required)

- **Round-trip save** — POST to companion `/write`; re-trigger parse and diagram refresh — S
- **Multi-file include resolution** — companion serves sibling `.thrift` files; viewer loads them to resolve cross-file type references in diagrams and completions — L

## Shared toolbar / modular note

Thrift and Proto share the same conceptual viewer structure (sections for structs/messages, services, enums). A shared `schema-diagram.js` module that accepts a normalised AST (messages + fields + services + methods) could serve both — worth extracting when the diagram feature is built. Keep the TextMate token provider in a `thrift-lang.js` file alongside the renderer so it can be reused if Monaco is upgraded.
