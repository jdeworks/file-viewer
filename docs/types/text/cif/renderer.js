// CIF (Crystallographic Information File) renderer — IUCr CIF 1.1 / mmCIF / CIF 2.0
// Parses data blocks, key-value pairs, and loop_ tables heuristically, then offers an opt-in
// interactive 3D structure view (3Dmol.js parses CIF crystal/mmCIF natively).

import { build3dPanel } from '../../../core/molview.js';

const CRYSTAL_KEYS = {
  '_cell_length_a': 'a (Å)',
  '_cell_length_b': 'b (Å)',
  '_cell_length_c': 'c (Å)',
  '_cell_angle_alpha': 'α (°)',
  '_cell_angle_beta': 'β (°)',
  '_cell_angle_gamma': 'γ (°)',
  '_cell_volume': 'Volume (ų)',
  '_cell_formula_units_Z': 'Z',
};

const COMPOUND_KEYS = {
  '_chemical_name_common': 'Common Name',
  '_chemical_name_systematic': 'Systematic Name',
  '_chemical_formula_moiety': 'Formula (moiety)',
  '_chemical_formula_sum': 'Molecular Formula',
  '_chemical_formula_weight': 'MW (g/mol)',
  '_chemical_melting_point': 'Melting Point (K)',
};

const META_KEYS = {
  '_diffrn_measurement_device': 'Diffractometer',
  '_diffrn_radiation_type': 'Radiation Type',
  '_diffrn_reflns_number': 'Reflections Measured',
  '_refine_ls_R_factor_gt': 'R-factor (gt)',
  '_refine_ls_R_factor_all': 'R-factor (all)',
  '_refine_ls_wR_factor_ref': 'wR (ref)',
  '_symmetry_space_group_name_H-M': 'Space Group',
  '_space_group_name_H-M_alt': 'Space Group',
  '_symmetry_Int_Tables_number': 'Int. Tables No.',
  '_exptl_crystal_colour': 'Crystal Colour',
  '_exptl_crystal_description': 'Crystal Shape',
  '_publ_author_name': 'Authors',
  '_publ_section_title': 'Publication Title',
  '_database_code_CSD': 'CSD Code',
  '_database_code_PDB': 'PDB Code',
};

const MMCIF_KEYS = {
  '_entity.pdbx_description': 'Entity',
  '_struct.title': 'Structure Title',
  '_exptl.method': 'Experimental Method',
  '_refine.ls_R_factor_obs': 'R-factor',
  '_entry.id': 'PDB Entry ID',
  '_pdbx_database_status.entry_id': 'PDB ID',
};

function parseCif(text) {
  const blocks = [];
  const blockRe = /^data_(\S*)/gm;
  let m;
  let lastEnd = 0;
  const matches = [];
  while ((m = blockRe.exec(text)) !== null) {
    matches.push({ name: m[1], start: m.index + m[0].length });
  }
  for (let i = 0; i < matches.length; i++) {
    const end = i + 1 < matches.length ? matches[i + 1].start - matches[i + 1].name.length - 5 : text.length;
    const body = text.slice(matches[i].start, end);
    blocks.push({ name: matches[i].name, body });
  }
  return blocks;
}

function extractKv(body) {
  const kv = {};
  // key value on same line: _key  value
  const sameLineRe = /^(_\S+)\s+(.+)/gm;
  let m;
  while ((m = sameLineRe.exec(body)) !== null) {
    const key = m[1].toLowerCase();
    let val = m[2].trim();
    // Remove surrounding quotes
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1);
    }
    kv[key] = val;
  }
  // semicolon-delimited multiline values: _key\n;\nvalue\n;
  const multiRe = /^(_\S+)\s*\n;([^;]*);/gm;
  while ((m = multiRe.exec(body)) !== null) {
    kv[m[1].toLowerCase()] = m[2].trim();
  }
  return kv;
}

function countLoops(body) {
  return (body.match(/^loop_/gm) || []).length;
}

function countAtoms(body) {
  // Count lines in atom_site loop (approximately: lines with just coordinates after _atom_site columns)
  // Better: count instances of atom type like "C  " or "N  " in coordinate tables
  const atomRe = /^[A-Z][a-z]?\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+/gm;
  return (body.match(atomRe) || []).length;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderKeySection(kv, keyMap, title) {
  const rows = Object.entries(keyMap)
    .filter(([k]) => kv[k] || kv[k.toLowerCase()])
    .map(([k, label]) => {
      const val = kv[k] || kv[k.toLowerCase()] || '';
      return `<div class="meta-row"><span class="meta-key">${esc(label)}</span><span class="meta-val">${esc(val)}</span></div>`;
    });
  if (!rows.length) return '';
  return `<div class="meta-section"><h4 class="meta-section-title">${esc(title)}</h4>${rows.join('')}</div>`;
}

export function render(intake) {
  const text = intake.text || '';
  if (!text) return { bodyHtml: '<p class="viewer-message">No CIF content found.</p>', hadUnsafe: false };

  const blocks = parseCif(text);
  if (!blocks.length) {
    return { bodyHtml: '<p class="viewer-message">No data_ blocks found — may not be a CIF file.</p>', hadUnsafe: false };
  }

  const ismmCIF = Object.keys(MMCIF_KEYS).some((k) => text.includes(k));
  const formatLabel = ismmCIF ? 'mmCIF / PDBx' : 'CIF 1.1';

  const parts = blocks.slice(0, 3).map((block, i) => {
    const kv = extractKv(block.body);
    const loops = countLoops(block.body);
    const atomCount = countAtoms(block.body);

    const blockHeader = blocks.length > 1
      ? `<h3 class="cif-block-title">Data block: ${esc(block.name || '(unnamed)')}</h3>` : '';

    const summaryHtml = `
      <div class="meta-section">
        <h4 class="meta-section-title">Block Summary</h4>
        <div class="meta-row"><span class="meta-key">Block name</span><span class="meta-val">${esc(block.name || '(unnamed)')}</span></div>
        <div class="meta-row"><span class="meta-key">Loop tables</span><span class="meta-val">${loops}</span></div>
        ${atomCount ? `<div class="meta-row"><span class="meta-key">Atom records (approx.)</span><span class="meta-val">${atomCount}</span></div>` : ''}
      </div>`;

    const compoundHtml = renderKeySection(kv, { ...COMPOUND_KEYS, ...MMCIF_KEYS }, 'Compound');
    const cellHtml = renderKeySection(kv, CRYSTAL_KEYS, 'Unit Cell');
    const metaHtml = renderKeySection(kv, META_KEYS, 'Experiment');

    return `<div class="cif-block">${blockHeader}${summaryHtml}${compoundHtml}${cellHtml}${metaHtml}</div>`;
  });

  if (blocks.length > 3) {
    parts.push(`<p class="viewer-note">${blocks.length - 3} more data block(s) not shown.</p>`);
  }

  const bodyHtml = `
      <style>
        .badge-cif { background: #0097a7; color: #fff; }
        .cif-block { margin-bottom: 1.5rem; }
        .cif-block-title { margin: 0 0 0.5rem; font-size: 0.95rem; font-family: monospace; }
      </style>
      <div class="badge-row">
        <span class="badge badge-cif">CIF</span>
        <span class="badge badge-cif" style="background:#00838f">${esc(formatLabel)}</span>
      </div>
      ${parts.join('\n')}`;

  // Only offer 3D when atom-site coordinates are present (some CIFs are metadata-only).
  const hasAtoms = /_atom_site[._]/.test(text);
  const host = document.createElement('div');
  host.className = 'mol-doc cif-doc';
  host.innerHTML = bodyHtml;
  let revoke = null;
  if (hasAtoms) {
    const label = blocks[0]?.name ? 'data_' + blocks[0].name : formatLabel;
    const panel = build3dPanel(text, 'cif', { label });
    host.appendChild(panel.el);
    revoke = panel.revoke;
  }
  return { parentNode: host, revoke, hadUnsafe: false };
}
