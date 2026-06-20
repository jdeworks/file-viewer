# Editor Roadmap — SDF/MOL (Structure-Data File)

## Current state
Metadata viewer for SDF multi-record files and plain MOL files. Parses both
V2000 and V3000 molblock formats. Computes molecular formula (Hill order),
approximate MW from element masses, bond type summary, and extracts common SD
data fields (PUBCHEM_*, NAME, MW, IUPAC_NAME). Shows up to 5 molecules with
per-molecule stats and a collapsible extra-fields section.

## Viewer enhancements (no write-back needed)

- **2D structure depiction** — Render each molblock as a 2D structure diagram on
  a `<canvas>` or inline SVG. Key lib: RDKit.js WASM
  (`/vendor/rdkit/RDKit_minimal.js`, ~3 MB) via
  `mol.get_svg_with_highlights()`. Kekule.js is a lighter alternative (~800 KB)
  if the WASM size is prohibitive — L (vendor bundle first)
- **Molecule grid view** — When an SDF contains multiple records, render a 3-up
  or 4-up grid of 2D thumbnails with the molecule name/formula below each.
  Clicking a thumbnail expands it with the full property table — M (after 2D)
- **3D conformer via 3Dmol.js** — If 3D coordinates are present in the molblock
  (z ≠ 0 for most atoms), offer a 3D tab. Load with
  `viewer.addModel(molText, 'sdf')` — S (after 3Dmol vendor bundle from PDB)
- **Property histogram** — For numeric SD fields (IC50, logP, MW), render a
  small bar histogram across all molecules in the SDF using a canvas sparkline.
  No external charting lib needed — M
- **SMILES display** — If RDKit.js is loaded, generate and show the canonical
  SMILES via `mol.get_smiles()`. Copy-to-clipboard button — S (after RDKit)
- **Substructure search** — Text input for a SMARTS pattern; RDKit.js
  `mol.get_substruct_match(query)` highlights matching atoms in the 2D view — L
- **Export as PNG** — Save the 2D SVG as PNG via the canvas — S (after 2D)

## In-browser editing (download-on-save)

- **SD data field editor** — Render all `> <FIELD>` blocks as a two-column
  key/value form. On save, serialize back with `\n> <KEY>\nVALUE\n$$$$\n`
  delimiters. The molecule coordinates are preserved verbatim — M
- **Add / remove SD fields** — Buttons to add a new named field or delete an
  existing one across all records (bulk) — S
- **Molecule record manager** — List of molecule names/formulas with checkboxes;
  download a filtered SDF containing only selected records — S

## Full write-back editing (companion required)

- **Atom coordinate editor** — 3Dmol drag-to-move atoms, saving back via
  companion. Useful for minimization seed generation — L
- **Property batch write** — Paste a CSV of (CID, property) pairs; companion
  maps by name and writes the SD fields back in bulk — M

## Shared toolbar / modular note
RDKit.js WASM is the blocking dependency for 2D depiction and SMARTS. Pre-bundle
it at `/vendor/rdkit/RDKit_minimal.js` and load lazily (only when the 2D tab is
first opened). XYZ shares the 3Dmol.js dep — coordinate vendor bundles across
both types. If RDKit.js is too heavy, Kekule.js provides 2D rendering and SMILES
output from a molfile without WASM, at the cost of no SMARTS support.
