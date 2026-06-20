# Editor Roadmap — DXF (AutoCAD Drawing Exchange Format)

## Current state

Rich structured viewer: parses group-code pairs; extracts version (`$ACADVER`), insertion units (`$INSUNITS`), sections present, entity type counts (with icons), layer names, block names, and key header variables including drawing extents/limits. Renders badge header, section pills, entity table, layer chips, block chips, and header variable grid. Returns `{ bodyHtml }`.

## Viewer enhancements (no write-back needed)

- **2D canvas render** — parse `LINE`, `CIRCLE`, `ARC`, `LWPOLYLINE`, `TEXT`, `INSERT` entities from the ENTITIES section; render to a `<canvas>` with pan/zoom (pointer events); use `$EXTMIN`/`$EXTMAX` for initial viewport — L (pure canvas, no lib; or dxf-parser npm ~80 KB ESM)
- **Layer toggle** — once the canvas is live, show a layer list with eye icons; toggling a layer hides/shows all entities on that layer in the canvas render — M (depends on canvas render)
- **2D measurement tool** — click two points on the canvas to measure distance in the file's native units; display in the status bar with unit conversion (mm/inch/m) — M (depends on canvas render)
- **Entity detail on hover** — hovering a rendered entity shows a tooltip with entity type, layer, and key attributes (start/end point, radius, text content) — M (depends on canvas render)
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

The 2D canvas render is the most impactful single feature. dxf-parser (MIT, ~80 KB ESM) handles the entity parsing robustly including `LWPOLYLINE` bulge arcs, which are error-prone to implement manually. Layer toggle and measurement tool build on top of it and share the entity list data structure. If vendoring dxf-parser is approved, it should replace the current group-code parser for the entity section (keeping the header/metadata parser in `renderer.js` as-is since it's fast and purpose-built).
