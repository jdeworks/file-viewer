const BOND_TYPE = { 1: 'single', 2: 'double', 3: 'triple', 4: 'aromatic' };
const ELEMENT_MASS = {
  H: 1.008, C: 12.011, N: 14.007, O: 15.999, F: 18.998, P: 30.974,
  S: 32.06, Cl: 35.45, Br: 79.904, I: 126.904, Si: 28.086, B: 10.811,
  Se: 78.971, As: 74.922, Te: 127.6, Sn: 118.71, Pb: 207.2,
};

function parseMolV2000(lines) {
  // line 0: molecule name, line 1: info, line 2: comment, line 3: counts
  const name = (lines[0] || '').trim();
  const countsLine = lines[3] || '';
  const atomCount = parseInt(countsLine.slice(0, 3), 10) || 0;
  const bondCount = parseInt(countsLine.slice(3, 6), 10) || 0;

  const atoms = [];
  for (let i = 0; i < atomCount; i++) {
    const line = lines[4 + i] || '';
    const elem = line.slice(31, 34).trim();
    if (elem) atoms.push(elem);
  }

  const bonds = [];
  for (let i = 0; i < bondCount; i++) {
    const line = lines[4 + atomCount + i] || '';
    const order = parseInt(line.slice(6, 9), 10) || 1;
    bonds.push(order);
  }

  return { name, atomCount, bondCount, atoms, bonds };
}

function parseMolV3000(lines) {
  const name = (lines[0] || '').trim();
  const atoms = [];
  const bonds = [];
  let inAtomBlock = false, inBondBlock = false;

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('M  V30 BEGIN ATOM')) { inAtomBlock = true; continue; }
    if (t.startsWith('M  V30 END ATOM')) { inAtomBlock = false; continue; }
    if (t.startsWith('M  V30 BEGIN BOND')) { inBondBlock = true; continue; }
    if (t.startsWith('M  V30 END BOND')) { inBondBlock = false; continue; }
    if (inAtomBlock && t.startsWith('M  V30')) {
      const parts = t.split(/\s+/);
      if (parts.length >= 4) atoms.push(parts[3]);
    }
    if (inBondBlock && t.startsWith('M  V30')) {
      const parts = t.split(/\s+/);
      if (parts.length >= 4) bonds.push(parseInt(parts[3], 10) || 1);
    }
  }

  return { name, atomCount: atoms.length, bondCount: bonds.length, atoms, bonds };
}

function parseMolblock(text) {
  const lines = text.split('\n').map((l) => l.replace(/\r$/, ''));
  const countsLine = lines[3] || '';
  const isV3000 = /V3000/.test(countsLine);
  return isV3000 ? parseMolV3000(lines) : parseMolV2000(lines);
}

function formula(atoms) {
  const counts = {};
  for (const el of atoms) counts[el] = (counts[el] || 0) + 1;
  const order = ['C', 'H'];
  const rest = Object.keys(counts).filter((e) => !order.includes(e)).sort();
  return [...order, ...rest]
    .filter((e) => counts[e])
    .map((e) => (counts[e] === 1 ? e : `${e}${counts[e]}`))
    .join('');
}

function molecularWeight(atoms) {
  let w = 0;
  for (const el of atoms) w += ELEMENT_MASS[el] || 0;
  return w ? w.toFixed(3) : null;
}

function bondSummary(bonds) {
  const counts = {};
  for (const o of bonds) {
    const label = BOND_TYPE[o] || 'other';
    counts[label] = (counts[label] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([k, v]) => `${v} ${k}`)
    .join(', ');
}

function parseSdf(text) {
  const molecules = [];
  const records = text.split(/^\$\$\$\$\r?\n?/m);
  for (const rec of records) {
    const trimmed = rec.trim();
    if (!trimmed) continue;
    const molEnd = trimmed.indexOf('M  END');
    if (molEnd === -1) continue;
    const molText = trimmed.slice(0, molEnd + 6);
    const dataText = trimmed.slice(molEnd + 6);
    const mol = parseMolblock(molText);
    const fields = {};
    const fieldRe = /^>\s+<([^>]+)>\s*\r?\n([\s\S]*?)(?=\n>\s+<|\n*$)/gm;
    let m;
    while ((m = fieldRe.exec(dataText)) !== null) {
      fields[m[1].trim()] = m[2].trim();
    }
    molecules.push({ mol, fields });
  }
  // If no $$$$, try as plain molfile
  if (molecules.length === 0 && /^M\s{2}END/m.test(text)) {
    const mol = parseMolblock(text);
    molecules.push({ mol, fields: {} });
  }
  return molecules;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function render(intake) {
  const text = intake.text || '';
  const molecules = parseSdf(text);

  if (molecules.length === 0) {
    return { bodyHtml: '<p class="viewer-message">No valid molecule found.</p>', hadUnsafe: false };
  }

  const parts = [];
  const previewCount = Math.min(molecules.length, 5);

  for (let idx = 0; idx < previewCount; idx++) {
    const { mol, fields } = molecules[idx];
    const f = formula(mol.atoms);
    const mw = fields['PUBCHEM_MOLECULAR_WEIGHT'] || fields['MW'] || fields['MOLECULAR_WEIGHT'] || molecularWeight(mol.atoms);
    const iupac = fields['PUBCHEM_IUPAC_NAME'] || fields['NAME'] || fields['IUPAC_NAME'] || null;
    const cid = fields['PUBCHEM_COMPOUND_CID'] || fields['CID'] || null;
    const exactMass = fields['PUBCHEM_EXACT_MASS'] || fields['EXACT_MASS'] || null;

    const molName = mol.name || fields['PUBCHEM_IUPAC_NAME'] || `Molecule ${idx + 1}`;
    const header = molecules.length > 1 ? `<h3 class="sdf-mol-title">${esc(molName)}</h3>` : '';

    const stats = [
      ['Formula', f || '—'],
      ['Atoms', String(mol.atomCount)],
      ['Bonds', String(mol.bondCount)],
      mw ? ['MW', `${mw} g/mol`] : null,
      exactMass ? ['Exact mass', `${exactMass} Da`] : null,
      bondSummary(mol.bonds) ? ['Bond types', bondSummary(mol.bonds)] : null,
    ].filter(Boolean);

    const statsHtml = stats.map(([k, v]) => `
      <div class="meta-row">
        <span class="meta-key">${esc(k)}</span>
        <span class="meta-val">${esc(v)}</span>
      </div>`).join('');

    const knownKeys = new Set([
      'PUBCHEM_COMPOUND_CID', 'PUBCHEM_IUPAC_NAME', 'PUBCHEM_MOLECULAR_FORMULA',
      'PUBCHEM_MOLECULAR_WEIGHT', 'PUBCHEM_EXACT_MASS', 'NAME', 'MW', 'CID',
      'IUPAC_NAME', 'EXACT_MASS', 'MOLECULAR_WEIGHT',
    ]);
    const extraFields = Object.entries(fields).filter(([k]) => !knownKeys.has(k));

    const identHtml = [
      iupac ? `<div class="meta-row"><span class="meta-key">IUPAC name</span><span class="meta-val">${esc(iupac)}</span></div>` : '',
      cid ? `<div class="meta-row"><span class="meta-key">PubChem CID</span><span class="meta-val">${esc(cid)}</span></div>` : '',
    ].join('');

    const extraHtml = extraFields.length
      ? `<div class="meta-section"><h4 class="meta-section-title">SD Data Fields</h4>${
          extraFields.map(([k, v]) => `<div class="meta-row"><span class="meta-key">${esc(k)}</span><span class="meta-val">${esc(v)}</span></div>`).join('')
        }</div>`
      : '';

    parts.push(`
      <div class="sdf-molecule">
        ${header}
        <div class="badge-row"><span class="badge badge-sdf">SDF/MOL</span></div>
        <div class="meta-section">
          <h4 class="meta-section-title">Structure</h4>
          ${statsHtml}
        </div>
        ${identHtml ? `<div class="meta-section"><h4 class="meta-section-title">Identifiers</h4>${identHtml}</div>` : ''}
        ${extraHtml}
      </div>`);
  }

  if (molecules.length > previewCount) {
    parts.push(`<p class="viewer-note">${molecules.length - previewCount} more molecule(s) not shown.</p>`);
  }

  return {
    bodyHtml: `
      <style>
        .sdf-molecule { margin-bottom: 2rem; }
        .sdf-mol-title { margin: 0 0 0.5rem; font-size: 1rem; }
        .badge-sdf { background: #4caf50; color: #fff; }
      </style>
      ${parts.join('\n')}`,
    hadUnsafe: false,
  };
}
