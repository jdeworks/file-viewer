# Editor Roadmap — GFF/GTF (General Feature Format)

## Current state
Summary viewer only. Parses directives (##gff-version, ##sequence-region),
counts features by type with a colored badge table, and lists up to 1000 feature
rows with per-chromosome chip list. GTF is handled because the same tab-delimited
9-column structure is shared.

## Viewer enhancements (no write-back needed)

- **Genome browser track (IGV-lite)** — Render features as horizontal bars on a
  `<canvas>` chromosomal ruler. Each feature type gets its existing color; strand
  is shown as arrowhead direction. Scrubbing the ruler updates the visible window.
  Key lib: no external dep needed for the basic canvas draw — M
- **Chromosomal ruler with base-pair scale** — Top ruler showing Mbp ticks,
  auto-scaled to the sequence-region span. Zoom in/out buttons (2×/0.5×) —  S
- **Feature track layers** — Stack gene, mRNA, exon, CDS on separate swim lanes
  so they don't overwrite each other. Height scales with track density — M
- **Filter by feature type** — Checkbox panel (one per type) that hides/shows
  tracks in real time. Pairs with the type table already shown — S
- **Search by gene / attribute** — Text input that searches the `attrs` column
  for `gene_id`, `Name=`, etc., highlights matching features, and scrolls the
  browser to the first hit — M
- **Attribute tooltip** — On hover over a feature bar, show a parsed attribute
  table (split on `;`, handle key=value and key "value" quoting for GFF3 vs GTF)
  in a floating panel — S
- **Export visible region as BED** — Download a filtered BED3 or BED6 of the
  current window; useful for piping into downstream tools — S

## In-browser editing (download-on-save)

- **Attribute editor** — Click a feature to open a sidebar form with editable
  key/value fields for the attrs column. Serialize back to the correct
  semicolon/quoting convention on save/download — M
- **Add feature row** — Form to insert a new tab-separated row with
  seqname/source/type/start/end/strand; validates coordinates against
  sequence-region bounds — M
- **Coordinate liftover helper** — Offset all features on a selected chromosome
  by a signed integer (useful for re-anchoring assemblies) — S

## Full write-back editing (companion required)

- **Feature drag-to-resize** — Drag the left/right edge of a feature bar on the
  canvas to adjust start/end; companion writes the delta back to the file — L
- **Live multi-file overlay** — Load a second GFF from disk and compare tracks
  side by side (e.g., annotation vs. prediction) — M (given companion)

## Shared toolbar / modular note
The canvas genome browser is the main investment; design it as a standalone
`gff-browser.js` module that accepts a feature array and a viewport object so it
can be reused if BED or VCF viewers are added later. For very large GFF3 files
(> 5 M features), consider a Web Worker that builds an interval tree and
serves only the visible window to the canvas.
