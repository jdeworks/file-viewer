# Editor Roadmap — XYZ (Molecular Coordinates)

## Current state
Metadata viewer. Parses multi-frame XYZ files (Xmol/MOPAC convention): atom
count, comment line, element symbol + Cartesian coordinates per atom. Computes
element counts, Hill-order molecular formula with subscript HTML, bounding box
dimensions, and a per-element table. Shows up to 3 frames with a note for
additional frames.

## Viewer enhancements (no write-back needed)

- **3D structure viewer via 3Dmol.js** — Load the XYZ text with
  `viewer.addModel(xyzText, 'xyz')` and render as sticks or ball-and-stick.
  Auto-detect bonds by covalent radius overlap (3Dmol does this internally) — L
  (vendor bundle first; share with PDB/SDF)
- **Color by element (CPK)** — Default CPK coloring (C=gray, O=red, N=blue,
  H=white, S=yellow, etc.). 3Dmol applies this automatically with `{scheme:'Jmol'}` — S
- **Multi-frame animation** — For trajectory XYZ files, a play/pause/step
  toolbar and a frame scrubber slider. 3Dmol supports frame animation via
  `setFrame()` — M (after 3Dmol)
- **Frame timeline** — A mini sparkline of a per-frame scalar (total energy from
  comment line if present, or bounding box volume) so users can spot
  conformational transitions — M
- **Energy / property parser** — Many XYZ comment lines carry energy, gradient
  norm, or other scalars (e.g., `energy=-76.4123 Ha`). Parse and display these
  in a per-frame table — S
- **Bounding box overlay** — Draw a wireframe box on the 3D viewer sized to the
  bounding box already computed — S (after 3Dmol)
- **Export as PNG** — Screenshot of the 3Dmol canvas — S (after 3Dmol)

## In-browser editing (download-on-save)

- **Comment line editor** — Inline editable input for each frame's comment line;
  useful for annotating frames with calculation metadata — S
- **Add / delete frame** — Button to duplicate a frame or remove it; serialize
  back as a concatenated XYZ file — S
- **Coordinate offset / rotation** — Numeric fields (TX, TY, TZ in Å; Rx, Ry,
  Rz in degrees) to translate or rotate all atoms. Recalculate and serialize — M
- **Atom property table editor** — Editable grid of element / x / y / z for each
  atom. The fixed column widths of the XYZ format are loose (space-separated),
  so output can use printf-style `%10.6f` formatting — M

## Full write-back editing (companion required)

- **Trajectory frame save** — After editing atom positions in the 3D viewer via
  drag (if 3Dmol exposes this), save back via companion — L
- **Append frame from clipboard** — Paste a new XYZ block; companion appends it
  to the file. Useful for building trajectory files incrementally — S

## Shared toolbar / modular note
3Dmol.js is the single blocking vendor dependency (shared with PDB and SDF).
The multi-frame animation controls are the highest-value unique feature for XYZ,
since PDB rarely has multiple frames. Design the frame scrubber as a reusable
component (`frame-scrubber.js`) that could later serve NMR PDB ensembles too.
For very large trajectories (> 10 000 frames), load frames lazily into a
ring buffer rather than all at once.
