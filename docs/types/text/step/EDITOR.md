# Editor Roadmap — STEP (ISO 10303-21 CAD Exchange)

## Current state

Metadata-only viewer: validates the `ISO-10303-21;` header, parses `FILE_DESCRIPTION`, `FILE_NAME`, `FILE_SCHEMA`, `FILE_SCHEMA` (author, organisation, CAD system, timestamp), counts total entities and shows the top-20 entity types by frequency. Returns `{ bodyHtml }`.

## Viewer enhancements (no write-back needed)

- **3D viewer** — load a STEP parser + Three.js renderer: occt-import-js (WASM build of OpenCASCADE, ~8 MB) converts STEP to Three.js geometry buffers; render on a `<canvas>` with orbit controls, zoom, and pan; add a "Load 3D" lazy-load gate — L (occt-import-js WASM, significant vendor size)
- **Feature tree** — once the STEP entity graph is parsed, display a hierarchical tree of `PRODUCT` → `NEXT_ASSEMBLY_USAGE_OCCURENCE` → `SHAPE_DEFINITION_REPRESENTATION` relationships; collapsible, similar to a CAD assembly tree — L (depends on 3D parser)
- **Bounding box and mass estimate** — after 3D parse, read the tight bounding box from the Three.js geometry; display in mm with volume estimate (assumes uniform density) — S (depends on 3D parser)
- **AP schema identifier** — the `FILE_SCHEMA` value (`AP214`, `AP242`, `AUTOMOTIVE_DESIGN`, etc.) maps to a known standard; show a human-readable label and a link to the ISO page — S
- **CAD system cross-reference** — map common `FILE_NAME` system strings (SolidWorks, CATIA, Creo, Siemens NX, FreeCAD, etc.) to display names and version badges — S
- **Entity type search** — filter the entity type table by typing; highlights matching rows — S

## In-browser editing (download-on-save)

- **Monaco STEP editor** — register a Monaco token provider for STEP syntax: entity references (`#N`), string literals, enumeration values (`.ENUM.`), entity type names, section keywords (`HEADER`, `DATA`, `ENDSEC`); Ctrl+S downloads — M (Monaco already vendored)
- **Header field editor** — form for `FILE_NAME` fields (filename, timestamp, author, organisation); edits patch the header text in-buffer; useful for stripping proprietary metadata before sharing — M
- **Entity reference renumbering** — renumber all `#N` references sequentially (fill gaps left by deleted entities); purely string-level transform — M
- **Strip specific entity types** — checkbox list of entity types; "Remove selected" deletes all instances and their forward references; useful for stripping colour/presentation data before export — L

## Full write-back editing (companion required)

- **Round-trip save** — POST to companion `/write`; re-trigger parse and 3D canvas refresh — S
- **Convert to other formats** — companion invokes FreeCAD headless or OpenCASCADE CLI to export STEP to IGES, STL, OBJ, or BREP — L

## Shared toolbar / modular note

occt-import-js is the only viable path for true STEP geometry rendering in the browser — alternatives (three-step, online-3d-viewer) also wrap OpenCASCADE. At ~8 MB WASM it must be lazily loaded behind a user gesture. The Monaco token provider for STEP entity syntax is ~1 KB and can ship independently long before the 3D viewer. The feature tree and bounding box features both depend on the 3D parser completing successfully. CAD system cross-reference and AP schema label are zero-dependency quick wins for the current metadata-only view.
