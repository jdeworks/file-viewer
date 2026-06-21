// PDB meta-drawer fields: header identity + structural summary (chains, residues, atoms, ligands)
// + experiment (method, resolution, R-factor). Parses the fixed-width PDB record format.
export function extractMetadata(intake) {
  const text = intake.text || '';
  const lines = text.split(/\r?\n/);
  const fields = {};

  const titleParts = [];
  const chains = new Set();
  const chainRes = {};      // chain -> Set(resKey)
  const ligands = new Set();
  let atomCount = 0, hetCount = 0;
  let method = '', resolution = null, rFactor = null;
  let depDate = '', pdbId = '', molType = '';

  for (const line of lines) {
    const rec = line.slice(0, 6).trim();
    if (rec === 'HEADER') {
      molType = line.slice(10, 50).trim();
      depDate = line.slice(50, 59).trim();
      pdbId = line.slice(62, 66).trim();
    } else if (rec === 'TITLE') {
      titleParts.push(line.slice(10).trim());
    } else if (rec === 'EXPDTA') {
      method = (method ? method + '; ' : '') + line.slice(10).trim();
    } else if (rec === 'REMARK') {
      if (/RESOLUTION\.\s+([\d.]+)\s+ANGSTROMS/i.test(line)) {
        const m = line.match(/([\d.]+)\s+ANGSTROMS/i);
        if (m) resolution = parseFloat(m[1]);
      } else if (/R VALUE.*WORKING SET/.test(line)) {
        const m = line.match(/:\s*([\d.]+)/);
        if (m) rFactor = parseFloat(m[1]);
      }
    } else if (rec === 'ATOM') {
      atomCount++;
      const chain = line[21] || '?';
      chains.add(chain);
      const resKey = line.slice(22, 27);
      (chainRes[chain] = chainRes[chain] || new Set()).add(resKey);
    } else if (rec === 'HETATM') {
      hetCount++;
      const resName = line.slice(17, 20).trim();
      if (resName !== 'HOH' && resName !== 'WAT') ligands.add(resName);
    }
  }

  const title = titleParts.join(' ').replace(/\s+/g, ' ').trim();
  const residues = Object.values(chainRes).reduce((s, set) => s + set.size, 0);

  if (pdbId) fields['PDB ID'] = pdbId;
  if (molType) fields['Molecule Type'] = molType;
  if (title) fields['Title'] = title;
  if (chains.size) fields['Chains'] = [...chains].sort().join(', ');
  if (residues) fields['Residues'] = String(residues);
  if (atomCount) fields['ATOM Records'] = String(atomCount);
  if (hetCount) fields['HETATM Records'] = String(hetCount);
  if (ligands.size) fields['Ligands'] = [...ligands].sort().join(', ');
  if (method) fields['Experimental Method'] = method;
  if (resolution != null) fields['Resolution'] = resolution.toFixed(2) + ' Å';
  if (rFactor != null) fields['R-factor'] = rFactor.toFixed(3);
  if (depDate) fields['Deposition Date'] = depDate;

  return fields;
}
