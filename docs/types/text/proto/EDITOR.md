# Editor Roadmap — Proto (Protocol Buffers)

## Current state

Rich structured viewer: parses `syntax`, `package`, `option`, `message` (with fields + field numbers), `service` (with RPCs + streaming direction), and `enum` definitions. Renders each as a colour-coded card with a table of fields/methods. Returns `{ parentNode }`. `index.js` sets `syntaxLanguage: 'proto'`, which is Monaco's registered language id for Protocol Buffers (aliased as "protobuf"/"Protocol Buffers") — raw-view syntax highlighting is wired.

## Viewer enhancements (no write-back needed)

- **Schema diagram** — render a visual message/service graph using a lightweight SVG layout (e.g. elkjs or a manual force-directed layout): message boxes with field rows connected by arrows for field types that reference other messages; service boxes linked to their request/response messages — L (elkjs ~120 KB or hand-rolled SVG)
- **Field number validation** — highlight duplicate field numbers and gaps in reserved ranges with inline warning badges inside each message card — S
- **Dependency graph for imports** — when `import` statements are present, list them as a directed graph showing which `.proto` files are depended on (static rendering only, no file loading) — M
- **Stub code preview** — for each message and service, show a collapsible panel with generated stub snippets (Go, Python, Java style) synthesised client-side from the parsed AST — M
- ✅ SHIPPED — **Monaco syntax highlight** — `index.js` already sets `syntaxLanguage: 'proto'` (Monaco's protobuf language id) — S

## In-browser editing (download-on-save)

- **Monaco editor mode** — load Monaco with `language: 'protobuf'`; Ctrl+S downloads; live re-parse drives the structured view in a split pane — M (Monaco already vendored)
- **Field number auto-assign** — toolbar action that scans the edited text and fills in the next available field number for any field that has `= 0` or is missing an assignment — M
- **Inline type completion** — register a Monaco `CompletionItemProvider` that suggests known message names from the current file as field types — M
- **Format on save** — basic proto formatter: normalise indentation, sort field numbers; pure string transform, no external lib — M

## Full write-back editing (companion required)

- **Round-trip save** — POST edited text to companion `/write`; re-parse and refresh the diagram panel on ACK — S
- **Cross-file import resolution** — companion serves sibling `.proto` files; the viewer loads them to resolve imported types in the diagram and completions — L

## Shared toolbar / modular note

The schema diagram and stub preview share the same parsed AST from `parseProto()` — extract the parser to a separate `parser.js` module so both the current renderer and a future `diagram.js` can import it without duplication. elkjs is the recommended layout engine; consider lazy-loading it behind a "Show diagram" button click to keep initial load fast.
