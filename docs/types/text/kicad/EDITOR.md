# Editor Roadmap — KiCad (PCB / Schematic / Library)

## Current state

Structured viewer: sniffs file kind (PCB layout, schematic, project, symbol/footprint library) from extension and header; parses the KiCad S-expression format; shows stat cards (footprint count, net count, track/via/zone counts for PCB; symbol/wire/label counts for schematic), layer chips, and property table. Returns `{ bodyHtml }`.

## Viewer enhancements (no write-back needed)

- **PCB layer toggle canvas** — parse copper tracks (`segment`), vias, footprint pads, silkscreen, courtyard, and fab layers from the `kicad_pcb` S-expression; render each layer as a coloured SVG or `<canvas>` path; show a layer panel with eye toggles and colour swatches — L (pure SVG/canvas; or pcb-stackup npm for layer colouring)
- **Schematic symbol preview** — for `.kicad_sym` libraries, render a vector preview of each symbol (pins, body rectangle, reference/value text) from the `pin`, `polyline`, and `rectangle` S-expressions — L
- **Component list / BOM export** — for PCB files, extract all `footprint` references with `reference`, `value`, `footprint`, and `description` fields; render as a sortable table; "Download CSV" button generates a BOM — M
- **Ratsnest viewer** — draw unrouted connections (airwires) between pads belonging to the same net; highlight selected net's ratsnest — M (depends on canvas render)
- **3D body extents** — from `kicad_pcb`, read `general.thickness` and outline polygon (`Edge.Cuts` layer); display a schematic cross-section showing board thickness — S

## In-browser editing (download-on-save)

- **Monaco KiCad S-expression editor** — register a Monaco token provider for the s-expression syntax (parentheses depth colouring, keyword highlighting for `kicad_pcb`, `footprint`, `segment`, `via`, `net`, `layer`, etc.); Ctrl+S downloads — M (Monaco already vendored)
- **Property editor for footprints** — click a footprint entry in the component list; an inline form edits its `reference`, `value`, and `description` S-expression nodes in the text buffer — L
- **Net rename** — toolbar dialog: rename a net across all `(net N "name")` and `(net "name")` references in the file — M
- **Layer colour customiser** — live edit layer colour assignments (stored as `(color R G B A)` in layer definitions); updates the canvas render immediately — S (depends on canvas render)

## Full write-back editing (companion required)

- **Round-trip save** — POST to companion `/write`; re-trigger parse and canvas refresh — S
- **KiCad CLI integration** — companion invokes `kicad-cli` to generate Gerbers, drill files, or PDF exports from the saved file — L

## Shared toolbar / modular note

The PCB canvas renderer is the biggest investment but unlocks layer toggle, ratsnest, and component click-through as a package. The S-expression parser (`parseSexpr` + `findAll`/`findFirst` helpers) is already well-structured in `renderer.js` — extract it to `kicad-parser.js` so the canvas renderer and BOM exporter can import it cleanly. BOM export to CSV is a high-value, zero-dependency feature that can ship before the canvas exists.
