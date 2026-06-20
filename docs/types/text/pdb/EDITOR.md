# Editor Roadmap — PDB (Protein Data Bank)

## Current state
Structured metadata viewer. Parses the fixed-width PDB record format: header,
title, COMPND/SOURCE compound blocks, EXPDTA (experimental method), REMARK 2
(resolution) and REMARK 3 (R-factor), per-chain residue/atom counts, and
HETATM ligand inventory. Renders a stats bar, metadata table, chain table, and
ligand table. No 3D rendering.

## Viewer enhancements (no write-back needed)

- **3D structure viewer via 3Dmol.js** — Embed the 3Dmol.js viewer
  (`/vendor/3dmol/3dmol-min.js`, ~1.5 MB) and load the PDB text directly using
  `viewer.addModel(text, 'pdb')`. Default to cartoon representation — L (vendor
  bundle first)
- **Color by chain** — Toolbar button group: chain / residue type / B-factor.
  3Dmol supports all three natively via `setStyle` options — S (after 3Dmol)
- **Color by B-factor** — Continuous spectral colormap mapped to the B-factor
  range parsed from ATOM records. Highlights flexible/disordered regions — S
- **Surface representation** — Toggle button between cartoon, stick, sphere, and
  solvent-accessible surface (SAS). 3Dmol's `addSurface` is one call — S
- **Measurement tool** — Click two atoms to display bond distance in Å; click
  three for angle in degrees. 3Dmol has `addDistance` / `addAngle` helpers — M
- **Ligand highlight** — Clicking a row in the ligand table centers the 3D view
  on that heteroatom group and switches it to stick/ball representation — S
- **Sequence strip** — Below the viewer, render a scrollable single-letter amino
  acid strip per chain; clicking a residue zooms the 3D view to it — M
- **Export as PNG** — `viewer.pngURI()` in 3Dmol, triggered by a toolbar button — S

## In-browser editing (download-on-save)

- **B-factor editor** — Table of ATOM records (residue × chain) with editable
  B-factor column. On download, reconstruct fixed-width ATOM lines with the new
  values. Useful for custom colouring workflows — M
- **Remark editor** — Editable textarea for REMARK blocks (annotation, method
  notes). Serialize back into 80-char REMARK lines — S
- **Chain selector / subset export** — Checkbox list of chains; download a PDB
  containing only selected chains. Pure string filter on "ATOM " records — S

## Full write-back editing (companion required)

- **Coordinate nudge** — Numeric delta fields (dX, dY, dZ) per chain; companion
  writes modified ATOM coordinates. Useful for rigid-body docking previews — L
- **Ligand swap** — Replace a HETATM block by pasting a new mol2/SDF snippet;
  companion handles the record renaming — L

## Shared toolbar / modular note
3Dmol.js must be pre-bundled at `/vendor/3dmol/3dmol-min.js` before any 3D
feature can ship — that is the single blocking dependency for this entire type.
CIF shares the same viewer need; bundle once and reference from both. NGL Viewer
(`/vendor/ngl/ngl.esm.js`) is a lighter ESM alternative if 3Dmol's UMD bundle
causes loading issues.
