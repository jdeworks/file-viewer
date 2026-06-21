// PDB protein structure viewer — parses fixed-width PDB record format, then offers an opt-in
// interactive 3D structure view (3Dmol.js, lazy-loaded on click).

import { build3dPanel } from '../../../core/molview.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const EXP_LABEL = {
  'X-RAY DIFFRACTION': 'X-ray crystallography',
  'ELECTRON MICROSCOPY': 'Cryo-EM',
  'SOLUTION NMR': 'NMR spectroscopy',
  'SOLID-STATE NMR': 'Solid-state NMR',
  'NEUTRON DIFFRACTION': 'Neutron diffraction',
  'ELECTRON CRYSTALLOGRAPHY': 'Electron crystallography',
};

const AA3 = new Set(['ALA','ARG','ASN','ASP','CYS','GLN','GLU','GLY','HIS','ILE',
  'LEU','LYS','MET','PHE','PRO','SER','THR','TRP','TYR','VAL']);

function parsePdb(text) {
  const lines = text.split(/\r?\n/);
  let pdbId = '', molType = '', depDate = '';
  const titleLines = [];
  const compndLines = [];
  const sourceLines = [];
  const expdtaLines = [];
  let resolution = null;
  let rFactor = null;

  // Per-chain tracking
  const chainResidues = {}; // chain -> Set of residue keys
  const chainAtoms = {};    // chain -> count
  const ligands = {};       // resName -> count (non-water heteroatoms)

  for (const line of lines) {
    const rec = line.slice(0, 6).trim();
    const rest = line.slice(6);

    if (rec === 'HEADER') {
      molType = line.slice(10, 50).trim();
      depDate = line.slice(50, 59).trim();
      pdbId = line.slice(62, 66).trim();
    } else if (rec === 'TITLE') {
      titleLines.push(rest.slice(4).trim());
    } else if (rec === 'COMPND') {
      compndLines.push(rest.slice(4).trim());
    } else if (rec === 'SOURCE') {
      sourceLines.push(rest.slice(4).trim());
    } else if (rec === 'EXPDTA') {
      expdtaLines.push(rest.slice(4).trim());
    } else if (rec === 'REMARK') {
      const remNum = line.slice(7, 10).trim();
      if (remNum === '2' && /RESOLUTION/.test(line)) {
        const m = line.match(/([\d.]+)\s*ANGSTROMS/i);
        if (m) resolution = parseFloat(m[1]);
      } else if (remNum === '3' && /R VALUE.*WORKING SET/.test(line)) {
        const m = line.match(/:\s*([\d.]+)/);
        if (m) rFactor = parseFloat(m[1]);
      }
    } else if (rec === 'ATOM') {
      const chain = line[21] || '?';
      const resSeq = line.slice(22, 26).trim();
      const iCode = line[26] || ' ';
      const resKey = resSeq + iCode;
      if (!chainResidues[chain]) chainResidues[chain] = new Set();
      chainResidues[chain].add(resKey);
      chainAtoms[chain] = (chainAtoms[chain] || 0) + 1;
    } else if (rec === 'HETATM') {
      const resName = line.slice(17, 20).trim();
      if (resName !== 'HOH' && resName !== 'WAT') {
        ligands[resName] = (ligands[resName] || 0) + 1;
      }
    }
  }

  const title = titleLines.join(' ').trim();
  const compnd = compndLines.join(' ').replace(/\s+/g, ' ').trim();
  const source = sourceLines.join(' ').replace(/\s+/g, ' ').trim();
  const expdta = expdtaLines.join('; ').trim();

  // Extract organism from SOURCE
  let organism = null;
  const orgM = source.match(/ORGANISM_SCIENTIFIC:\s*([^;]+)/i);
  if (orgM) organism = orgM[1].trim();

  // Extract molecule name from COMPND
  let molecule = null;
  const molM = compnd.match(/MOLECULE:\s*([^;]+)/i);
  if (molM) molecule = molM[1].trim();

  const chains = Object.keys(chainResidues).sort();
  const totalAtoms = Object.values(chainAtoms).reduce((a, b) => a + b, 0);
  const totalResidues = chains.reduce((sum, c) => sum + chainResidues[c].size, 0);
  const expLabel = EXP_LABEL[expdta] || expdta;

  return { pdbId, molType, depDate, title, molecule, organism, expLabel, resolution, rFactor,
    chains, chainResidues, chainAtoms, totalAtoms, totalResidues, ligands };
}

export function render(intake) {
  const text = intake.text || '';
  const info = parsePdb(text);

  const metaRows = [
    info.pdbId && `<tr><td class="pdb-key">PDB ID</td><td class="pdb-val"><code>${esc(info.pdbId)}</code></td></tr>`,
    info.molType && `<tr><td class="pdb-key">Molecule type</td><td class="pdb-val">${esc(info.molType)}</td></tr>`,
    info.molecule && `<tr><td class="pdb-key">Molecule name</td><td class="pdb-val">${esc(info.molecule)}</td></tr>`,
    info.organism && `<tr><td class="pdb-key">Organism</td><td class="pdb-val"><em>${esc(info.organism)}</em></td></tr>`,
    info.expLabel && `<tr><td class="pdb-key">Method</td><td class="pdb-val">${esc(info.expLabel)}</td></tr>`,
    info.resolution != null && `<tr><td class="pdb-key">Resolution</td><td class="pdb-val">${info.resolution.toFixed(2)} Å</td></tr>`,
    info.rFactor != null && `<tr><td class="pdb-key">R-factor</td><td class="pdb-val">${info.rFactor.toFixed(3)}</td></tr>`,
    info.depDate && `<tr><td class="pdb-key">Deposited</td><td class="pdb-val">${esc(info.depDate)}</td></tr>`,
  ].filter(Boolean).join('');

  const chainRows = info.chains.map((c) => {
    const res = info.chainResidues[c].size;
    const atoms = info.chainAtoms[c] || 0;
    return `<tr><td class="pdb-chain">${esc(c)}</td><td>${res} residues</td><td>${atoms.toLocaleString()} atoms</td></tr>`;
  }).join('');

  const ligandRows = Object.entries(info.ligands).map(([n, c]) =>
    `<tr><td class="pdb-lig-name">${esc(n)}</td><td>${c} atoms</td></tr>`
  ).join('');

  const stats = [
    info.totalResidues && `<div class="pdb-stat"><div class="pdb-stat-value">${info.totalResidues.toLocaleString()}</div><div class="pdb-stat-label">Residues</div></div>`,
    info.totalAtoms && `<div class="pdb-stat"><div class="pdb-stat-value">${info.totalAtoms.toLocaleString()}</div><div class="pdb-stat-label">Atoms</div></div>`,
    info.chains.length && `<div class="pdb-stat"><div class="pdb-stat-value">${info.chains.length}</div><div class="pdb-stat-label">Chain${info.chains.length !== 1 ? 's' : ''}</div></div>`,
    Object.keys(info.ligands).length && `<div class="pdb-stat"><div class="pdb-stat-value">${Object.keys(info.ligands).length}</div><div class="pdb-stat-label">Ligand${Object.keys(info.ligands).length !== 1 ? 's' : ''}</div></div>`,
  ].filter(Boolean).join('');

  const bodyHtml = `<div class="pdb-preview">
  <div class="pdb-header">
    <span class="badge-pdb">PDB</span>
    ${info.pdbId ? `<span class="pdb-id">${esc(info.pdbId)}</span>` : ''}
    ${info.title ? `<span class="pdb-title">${esc(info.title)}</span>` : ''}
  </div>
  <div class="pdb-stats">${stats}</div>
  ${metaRows ? `<table class="pdb-meta">${metaRows}</table>` : ''}
  ${chainRows ? `<h3 class="pdb-section">Chains</h3><table class="pdb-chains"><thead><tr><th>Chain</th><th>Residues</th><th>Atoms</th></tr></thead><tbody>${chainRows}</tbody></table>` : ''}
  ${ligandRows ? `<h3 class="pdb-section">Ligands</h3><table class="pdb-ligands"><thead><tr><th>Name</th><th>Count</th></tr></thead><tbody>${ligandRows}</tbody></table>` : ''}
</div>`;

  // Render in the parent pane (mol-doc) so the opt-in 3D panel can mount a WebGL canvas.
  const host = document.createElement('div');
  host.className = 'mol-doc pdb-doc';
  host.innerHTML = bodyHtml;
  const label = [info.pdbId, info.totalAtoms ? info.totalAtoms.toLocaleString() + ' atoms' : '']
    .filter(Boolean).join(' · ');
  const panel = build3dPanel(text, 'pdb', { label });
  host.appendChild(panel.el);
  return { parentNode: host, revoke: panel.revoke };
}
