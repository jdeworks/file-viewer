# Editor Roadmap — CIF/mmCIF (Crystallographic Information File)

## Current state
Metadata viewer supporting both small-molecule CIF 1.1 and macromolecular
mmCIF/PDBx. Parses data_ blocks, extracts key-value pairs (same-line and
semicolon multiline), and renders sections for compound identity, unit cell
parameters, and experiment metadata. Auto-detects mmCIF by the presence of
`_entity`/`_struct` keys. Atom count is approximated via regex, not a full
loop_ table parse.

## Viewer enhancements (no write-back needed)

- **3D structure viewer** — Same 3Dmol.js or NGL path as PDB. 3Dmol accepts
  CIF/mmCIF directly with `viewer.addModel(text, 'cif')` — L (vendor bundle
  first; share with PDB)
- **Color by chain / residue / B-factor** — Identical to PDB once 3Dmol is
  loaded — S (after 3Dmol)
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
CIF and PDB share the same 3Dmol.js dependency — vendor-bundle once. The
loop_ table browser is the highest-value pure-JS feature here; a robust CIF
loop parser should be extracted as `cif-loop.js` since loop_ blocks also appear
in mmCIF dictionaries used by deposition pipelines.
