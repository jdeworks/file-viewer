function parseSdfMeta(text) {
  const lines = text.split('\n').map((l) => l.replace(/\r$/, ''));
  const name = (lines[0] || '').trim();
  const countsLine = lines[3] || '';
  const atomCount = parseInt(countsLine.slice(0, 3), 10) || 0;
  const bondCount = parseInt(countsLine.slice(3, 6), 10) || 0;
  const isV3000 = /V3000/.test(countsLine);
  const moleculeCount = (text.match(/^\$\$\$\$/gm) || []).length || 1;
  const formula = fields(text, 'PUBCHEM_MOLECULAR_FORMULA') || fields(text, 'MOLECULAR_FORMULA');
  const mw = fields(text, 'PUBCHEM_MOLECULAR_WEIGHT') || fields(text, 'MW');
  const iupac = fields(text, 'PUBCHEM_IUPAC_NAME') || fields(text, 'IUPAC_NAME');
  return { name, atomCount, bondCount, isV3000, moleculeCount, formula, mw, iupac };
}

function fields(text, key) {
  const m = new RegExp(`^>\\s+<${key}>\\s*\\r?\\n([^\\n]+)`, 'm').exec(text);
  return m ? m[1].trim() : null;
}

export function extractMetadata(intake) {
  const text = intake.text || '';
  if (!text) return {};
  const { name, atomCount, bondCount, isV3000, moleculeCount, formula, mw, iupac } = parseSdfMeta(text);
  const result = {};
  if (name) result['Molecule Name'] = name;
  if (iupac) result['IUPAC Name'] = iupac;
  if (formula) result['Molecular Formula'] = formula;
  if (mw) result['Molecular Weight'] = `${mw} g/mol`;
  if (atomCount) result['Atom Count'] = String(atomCount);
  if (bondCount) result['Bond Count'] = String(bondCount);
  result['Format'] = isV3000 ? 'MDL Molfile V3000' : 'MDL Molfile V2000';
  if (moleculeCount > 1) result['Molecule Count'] = String(moleculeCount);
  return result;
}
