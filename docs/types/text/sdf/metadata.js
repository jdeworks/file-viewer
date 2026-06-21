// SDF / MDL Molfile meta-drawer fields: identity (name, IUPAC, CID), structure (formula, atoms,
// bonds, MW), record count, and format. Formula falls back to one computed from the atom block
// when no PUBCHEM_MOLECULAR_FORMULA field is present.
const ELEMENT_ORDER = ['C', 'H'];

function parseCounts(lines) {
  const countsLine = lines[3] || '';
  const isV3000 = /V3000/.test(countsLine);
  let atomCount = parseInt(countsLine.slice(0, 3), 10) || 0;
  let bondCount = parseInt(countsLine.slice(3, 6), 10) || 0;
  const elems = [];
  if (!isV3000) {
    for (let i = 0; i < atomCount; i++) {
      const el = (lines[4 + i] || '').slice(31, 34).trim();
      if (el) elems.push(el);
    }
  } else {
    // V3000: atoms listed in M  V30 lines between BEGIN/END ATOM.
    let inAtom = false;
    for (const l of lines) {
      const t = l.trim();
      if (t.startsWith('M  V30 BEGIN ATOM')) { inAtom = true; continue; }
      if (t.startsWith('M  V30 END ATOM')) { inAtom = false; continue; }
      if (inAtom && t.startsWith('M  V30')) {
        const p = t.split(/\s+/);
        if (p.length >= 4) elems.push(p[3]);
      }
    }
    atomCount = atomCount || elems.length;
  }
  return { isV3000, atomCount, bondCount, elems };
}

function computeFormula(elems) {
  if (!elems.length) return null;
  const counts = {};
  for (const e of elems) counts[e] = (counts[e] || 0) + 1;
  const rest = Object.keys(counts).filter((e) => !ELEMENT_ORDER.includes(e)).sort();
  return [...ELEMENT_ORDER, ...rest].filter((e) => counts[e]).map((e) => (counts[e] === 1 ? e : e + counts[e])).join('');
}

function field(text, key) {
  const m = new RegExp(`^>\\s+<${key}>\\s*\\r?\\n([^\\n]+)`, 'm').exec(text);
  return m ? m[1].trim() : null;
}

export function extractMetadata(intake) {
  const text = intake.text || '';
  if (!text) return {};
  const lines = text.split('\n').map((l) => l.replace(/\r$/, ''));
  const name = (lines[0] || '').trim();
  const { isV3000, atomCount, bondCount, elems } = parseCounts(lines);
  const moleculeCount = (text.match(/^\$\$\$\$/gm) || []).length || 1;

  const result = {};
  if (name) result['Molecule Name'] = name;
  const iupac = field(text, 'PUBCHEM_IUPAC_NAME') || field(text, 'IUPAC_NAME');
  if (iupac) result['IUPAC Name'] = iupac;
  const cid = field(text, 'PUBCHEM_COMPOUND_CID') || field(text, 'CID');
  if (cid) result['PubChem CID'] = cid;

  const formula = field(text, 'PUBCHEM_MOLECULAR_FORMULA') || field(text, 'MOLECULAR_FORMULA') || computeFormula(elems);
  if (formula) result['Molecular Formula'] = formula;
  const mw = field(text, 'PUBCHEM_MOLECULAR_WEIGHT') || field(text, 'MW');
  if (mw) result['Molecular Weight'] = mw + ' g/mol';
  const exact = field(text, 'PUBCHEM_EXACT_MASS') || field(text, 'EXACT_MASS');
  if (exact) result['Exact Mass'] = exact + ' Da';
  if (atomCount) result['Atom Count'] = String(atomCount);
  if (bondCount) result['Bond Count'] = String(bondCount);

  result['Format'] = isV3000 ? 'MDL Molfile V3000' : 'MDL Molfile V2000';
  if (moleculeCount > 1) result['Molecule Count'] = String(moleculeCount);

  return result;
}
