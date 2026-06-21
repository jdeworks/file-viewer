// CIF meta-drawer fields: identity (block, name, formula), unit cell (a/b/c, α/β/γ, volume, Z),
// and symmetry (space group). Covers small-molecule CIF and mmCIF/PDBx.
function val(text, key) {
  // key value on the same line; tolerate single/double quotes around the value.
  const re = new RegExp('^' + key.replace(/[.[\]]/g, '\\$&') + "\\s+(?:'([^']*)'|\"([^\"]*)\"|(\\S.*))$", 'mi');
  const m = re.exec(text);
  if (!m) return null;
  return (m[1] ?? m[2] ?? m[3] ?? '').trim();
}

// Strip CIF standard-uncertainty parentheses for display: "11.446(2)" -> "11.446".
const num = (v) => (v == null ? null : v.replace(/\(\d+\)/g, ''));

export function extractMetadata(intake) {
  const text = intake.text || '';
  if (!text) return {};
  const result = {};

  const dataBlock = text.match(/^data_(\S*)/m);
  if (dataBlock) result['Data Block'] = dataBlock[1] || '(unnamed)';
  const blockCount = (text.match(/^data_/gm) || []).length;
  if (blockCount > 1) result['Block Count'] = String(blockCount);

  const name = val(text, '_chemical_name_common') || val(text, '_chemical_name_systematic') || val(text, '_struct.title');
  if (name) result['Name'] = name;
  const formula = val(text, '_chemical_formula_sum') || val(text, '_chemical_formula_moiety');
  if (formula) result['Formula'] = formula;
  const mw = val(text, '_chemical_formula_weight');
  if (mw) result['Formula Weight'] = mw + ' g/mol';

  const a = num(val(text, '_cell_length_a')), b = num(val(text, '_cell_length_b')), c = num(val(text, '_cell_length_c'));
  if (a && b && c) result['Cell a, b, c'] = `${a}, ${b}, ${c} Å`;
  const al = num(val(text, '_cell_angle_alpha')), be = num(val(text, '_cell_angle_beta')), ga = num(val(text, '_cell_angle_gamma'));
  if (al && be && ga) result['Cell α, β, γ'] = `${al}, ${be}, ${ga} °`;
  const vol = num(val(text, '_cell_volume'));
  if (vol) result['Cell Volume'] = vol + ' Å³';
  const z = val(text, '_cell_formula_units_Z');
  if (z) result['Z'] = z;

  const sg = val(text, '_symmetry_space_group_name_H-M') || val(text, '_space_group_name_H-M_alt');
  if (sg) result['Space Group'] = sg;
  const itn = val(text, '_symmetry_Int_Tables_number') || val(text, '_space_group_IT_number');
  if (itn) result['Int. Tables No.'] = itn;

  const ismmCIF = /_entity\.|_struct\.|_pdbx_/.test(text);
  result['Format'] = ismmCIF ? 'mmCIF / PDBx' : 'CIF 1.1';

  return result;
}
