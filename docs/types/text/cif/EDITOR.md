# Editor Roadmap — CIF/mmCIF (Crystallographic Information File)

## Current state
Metadata viewer supporting both small-molecule CIF 1.1 and macromolecular
mmCIF/PDBx. Parses data_ blocks, extracts key-value pairs (same-line and
semicolon multiline), and renders sections for compound identity, unit cell
parameters, and experiment metadata. Auto-detects mmCIF by the presence of
`_entity`/`_struct` keys. Atom count is approximated via regex, not a full
loop_ table parse. **3D structure viewer shipped**: `renderer.js` imports the
shared `build3dPanel()` from `docs/core/molview.js` (vendored 3Dmol.js,
opt-in/click-to-load) and offers it whenever `_atom_site` coordinates are
present; the panel supports stick/sphere/cartoon/wireframe styles and spin.
Same code path is shared with PDB/XYZ/SDF.

## Viewer enhancements (no write-back needed)

- **Color by chain / residue / B-factor** — 3Dmol's style dropdown already
  offers stick/sphere/cartoon/wireframe; per-chain/B-factor colour mapping is
  not yet exposed — S (extend `molview.js` `styleSpec`, shared with PDB)
- **Unit cell wireframe overlay** — Draw the crystallographic unit cell box on
  the 3D viewer using the a/b/c/alpha/beta/gamma parameters already parsed.
  3Dmol supports arbitrary box primitives via `addBox` — M
- **Loop_ table browser** — Parse all `loop_` blocks and render each as a
  collapsible table with column headers. Essential for _atom_site,
  _diffrn_refln, and _chem_comp loop blocks — M
- **Space group info card** — Map the H-M symbol already extracted to a short
  explanation (crystal system, point group, multiplicity). A static 230-entry
  lookup table covers all cases — S
- **CIF vs mmCIF badge** — Already shown, but extend to also detect CIF 2.0
  (backslash line continuation) and label accordingly — S

## In-browser editing (download-on-save)

- **Key-value field editor** — Render the compound/cell/experiment sections with
  inline editable inputs. On save, serialize back using the `_key  value` format,
  quoting strings with apostrophes and preserving unedited raw lines — M
- **Loop_ cell editor** — For small loops (< 500 rows), render as a spreadsheet
  grid (similar to the CSV editor in rawpane.js). On download, reconstruct the
  `loop_` header and column-aligned data rows — L
- **Add / remove data block** — UI to duplicate or delete a `data_` block; useful
  when trimming multi-compound CIF files from the CSD — M

## Full write-back editing (companion required)

- **Atom coordinate editor** — Editable `_atom_site` loop with x/y/z fractional
  coordinates. Companion writes back with correct formatting and updates the
  `_cell_` derived values if changed — L
- **Reflection data editor** — Edit `_diffrn_refln` loop values for
  crystallographers re-refining structures — L

## Shared toolbar / modular note
CIF and PDB already share the same vendored 3Dmol.js dependency via
`docs/core/molview.js` (`build3dPanel`) — no further vendor work needed. The
loop_ table browser is the highest-value pure-JS feature remaining here; a
robust CIF loop parser should be extracted as `cif-loop.js` since loop_ blocks
also appear in mmCIF dictionaries used by deposition pipelines.
