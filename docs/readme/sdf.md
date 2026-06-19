# SDF / MDL Molfile

> SDF and MDL Molfile viewer — molecular formula, atom/bond counts, molecular weight, bond type summary, and SD data fields.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.sdf`, `.mol`, `.sd` |
| MIME type | `chemical/x-mdl-sdfile`, `chemical/x-mdl-molfile` |
| Binary / Text | Text |
| Common use | Chemical structure exchange, pharmaceutical databases (PubChem, ChEMBL) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Molecular formula | ✅ | Hill notation (C first, H second, then alphabetical) |
| Atom count | ✅ | Total atoms from ATOM block |
| Bond count | ✅ | Total bonds from BOND block |
| Molecular weight | ✅ | Calculated from element masses; overridden by SD field |
| Exact mass | ✅ | From SD data field if present |
| Bond type summary | ✅ | Single/double/triple/aromatic bond counts |
| IUPAC name | ✅ | From `PUBCHEM_IUPAC_NAME` or `NAME` SD field |
| PubChem CID | ✅ | From `PUBCHEM_COMPOUND_CID` or `CID` SD field |
| SD data fields | ✅ | All additional key-value pairs shown |
| V2000 / V3000 detection | ✅ | Molfile format version auto-detected |
| Multi-molecule SDF | ✅ | Up to 5 molecules shown (count reported) |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Text diff | ✅ | Standard line diff |
| Preferred mode | Preview | Opens directly in preview |
| Metadata | ✅ | Formula, atom count, MW, molecule count |

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

- No 2D chemical structure drawing
- Stereochemistry (chiral centres, E/Z bonds) is not shown
- Reaction files (`.rxn`) are not supported

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| 2D structure rendering | Med | Hard | Requires RDKit.js or Kekule.js WASM |
| Export SMILES string | Med | Med | Derive SMILES from connectivity table |
| SD field filter / search | Low | Easy | Filter multi-molecule SDF by SD field value |
