# Protein Structure (PDB)

> PDB protein structure viewer — PDB ID, experimental method, resolution, chains with residue/atom counts, and ligand list.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.pdb`, `.ent` |
| MIME type | `chemical/x-pdb` |
| Binary / Text | Text (fixed-width columns) |
| Common use | Protein Data Bank structures from X-ray crystallography, cryo-EM, NMR |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| PDB ID | ✅ | From HEADER record |
| Molecule type | ✅ | Classification from HEADER (e.g. HYDROLASE) |
| Molecule name | ✅ | From COMPND `MOLECULE:` field |
| Organism | ✅ | From SOURCE `ORGANISM_SCIENTIFIC:` |
| Experimental method | ✅ | X-ray / Cryo-EM / NMR from EXPDTA |
| Resolution | ✅ | From REMARK 2 (Å) |
| R-factor | ✅ | From REMARK 3 working set R value |
| Deposition date | ✅ | From HEADER record |
| Chain list | ✅ | Chain ID, residue count, atom count per chain |
| Total atoms & residues | ✅ | Summary stat cards |
| Ligands | ✅ | HETATM records (excl. HOH/WAT) with atom counts |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | PDB ID, method, resolution, residues, atoms |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- No 3D molecular visualization
- NMR structures with multiple models show only the first model's atom count
- mmCIF / PDBx format is handled by the `cif` viewer, not this one

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| 3D structure via NGL Viewer | Med | Hard | Render protein in-browser (~2 MB WASM) |
| FASTA sequence export | Med | Easy | Extract SEQRES records to FASTA |
| Secondary structure summary | Low | Med | α-helix / β-sheet counts from HELIX/SHEET records |
