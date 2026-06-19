export function extractMetadata(intake) {
  const text = intake.text || '';
  if (!text) return {};
  const result = {};

  const dataBlock = text.match(/^data_(\S*)/m);
  if (dataBlock) result['Data Block'] = dataBlock[1] || '(unnamed)';

  const blockCount = (text.match(/^data_/gm) || []).length;
  if (blockCount > 1) result['Block Count'] = String(blockCount);

  const formula = text.match(/^_chemical_formula_sum\s+['"']?([^'"\n]+)['"']?/mi);
  if (formula) result['Formula'] = formula[1].trim();

  const name = text.match(/^_chemical_name_common\s+['"']?([^'"\n]+)['"']?/mi);
  if (name) result['Common Name'] = name[1].trim();

  const spaceGroup = text.match(/^_symmetry_space_group_name_H-M\s+['"']?([^'"\n]+)['"']?/mi)
    || text.match(/^_space_group_name_H-M_alt\s+['"']?([^'"\n]+)['"']?/mi);
  if (spaceGroup) result['Space Group'] = spaceGroup[1].trim().replace(/'/g, '');

  const ismmCIF = /_entity\.|_struct\.|_pdbx_/.test(text);
  result['Format'] = ismmCIF ? 'mmCIF / PDBx' : 'CIF 1.1';

  return result;
}
