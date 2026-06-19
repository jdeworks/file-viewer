function hasExtension(intake, ...exts) {
  const name = (intake.filename || '').toLowerCase();
  return exts.some((e) => name.endsWith('.' + e));
}

export function detect(intake) {
  if (intake.isBinary) return 0;
  const sample = (intake.textSample || intake.text || '').slice(0, 1500);

  // CIF files start with 'data_' block headers and use '_key value' pairs
  const hasDataBlock = /^data_/m.test(sample);
  const hasCifKey = /^_[a-z_]+\./m.test(sample) || /^_cell_|^_atom_|^_symmetry_|^_diffrn_/m.test(sample);
  const hasLoop = /^loop_/m.test(sample);

  if (hasExtension(intake, 'cif', 'mmcif', 'cif2')) {
    if (hasDataBlock || hasCifKey) return 0.96;
    return 0.6;
  }

  if (hasDataBlock && hasCifKey) return 0.88;
  if (hasDataBlock && hasLoop) return 0.70;
  return 0;
}
