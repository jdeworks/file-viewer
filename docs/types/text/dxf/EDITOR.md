# Editor Roadmap — DXF (AutoCAD Drawing Exchange Format)

## Current state

Rich structured viewer: parses group-code pairs; extracts version (`$ACADVER`), insertion units (`$INSUNITS`), sections present, entity type counts (with icons), layer names, block names, and key header variables including drawing extents/limits. Renders badge header, section pills, entity table, layer chips, block chips, and header variable grid. Returns `{ bodyHtml }`.

- ✅ SHIPPED — **2D canvas render** — `geometry.js` walks the ENTITIES section and extracts drawable primitives (`LINE`, `CIRCLE`, `ARC`, `ELLIPSE`, `POINT`, `LWPOLYLINE`/`POLYLINE` (incl. old-style VERTEX/SEQEND), `SPLINE`, `TEXT`/`MTEXT`, `SOLID`/`3DFACE`, `INSERT`); `renderer.js` draws them to a `<canvas>` inside the sandboxed preview iframe with fit + scroll-zoom + drag-pan (pointer/wheel events), auto-framed from the entity bounds (falls back to `$EXTMIN`/`$EXTMAX` when no drawables exist). Model space only — `INSERT` block references are drawn as a marker at the insertion point (blocks aren't expanded), and `LWPOLYLINE` bulge arcs are approximated as straight segments. The geometry JSON is injected via an inline `<script>` with `<`/backtick/`$` escaping so no entity text (e.g. a crafted `TEXT`/`MTEXT` value) can break out of the script tag or the surrounding template literal — see the "Shared toolbar" note below.

## Viewer enhancements (no write-back needed)

- **Layer toggle** — show a layer list with eye icons; toggling a layer hides/shows all entities on that layer in the canvas render — M
- **2D measurement tool** — click two points on the canvas to measure distance in the file's native units; display in the status bar with unit conversion (mm/inch/m) — M
- **Entity detail on hover** — hovering a rendered entity shows a tooltip with entity type, layer, and key attributes (start/end point, radius, text content) — M
- **Block reference exploder** — for each `INSERT` entity, show which block it references; list all INSERT placements of a selected block as a table — S

## In-browser editing (download-on-save)

- **Monaco DXF editor** — register a Monaco token provider for group codes (integer on odd lines), section keywords (`SECTION`, `ENDSEC`, `ENTITIES`), and entity type keywords; mount in editor mode; Ctrl+S downloads — M (Monaco already vendored; DXF token provider ~1 KB)
- **Layer property editor** — table UI listing each layer with editable columns: name, colour (ACI code picker), linetype, visibility; edits patch the TABLES section group-code pairs in the text buffer — L
- **Add entity form** — toolbar dialog for adding a `LINE` or `CIRCLE` by entering coordinates; appends the group-code block to the ENTITIES section — M
- **Unit conversion** — dropdown to change `$INSUNITS`; scales all coordinate values in the file accordingly — L

## Full write-back editing (companion required)

- **Round-trip save** — POST to companion `/write`; re-trigger parse and canvas refresh — S
- **ODA/LibreCAD export** — companion invokes LibreCAD headless or ODA File Converter to export to SVG, PDF, or newer DXF version — L

## Shared toolbar / modular note

The hand-rolled `geometry.js` parser (no external dep) now covers the common drawable entity
types, including `LWPOLYLINE` bulge-free vertex collection; true bulge-arc curvature is still
approximated as straight segments. dxf-parser (MIT, ~80 KB ESM) would improve bulge-arc fidelity
if vendored, but is not required for the current feature set. Layer toggle and measurement tool
build on top of the existing entity list / bounds data structure returned by `parseGeometry()`.
