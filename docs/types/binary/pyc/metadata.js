function getPythonVersion(magic) {
  if (magic >= 62061 && magic <= 62211) return '2.7';
  if (magic >= 50700 && magic <= 50823) return '2.6';
  if (magic >= 23012) return '2.0–2.5';
  if (magic >= 3571) return '3.13+';
  if (magic >= 3530) return '3.12';
  if (magic >= 3450) return '3.11';
  if (magic >= 3430) return '3.10';
  if (magic >= 3420) return '3.9';
  if (magic >= 3401) return '3.8';
  if (magic >= 3390) return '3.7';
  if (magic >= 3360) return '3.6';
  if (magic >= 3310) return '3.5';
  if (magic >= 3250) return '3.4';
  if (magic >= 3190) return '3.3';
  if (magic >= 3151) return '3.2';
  if (magic >= 3131) return '3.1';
  if (magic >= 3000) return '3.0';
  return null;
}

export function metadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 4 || b[2] !== 0x0d || b[3] !== 0x0a) return {};
  const magic = b[0] | (b[1] << 8);
  const version = getPythonVersion(magic);
  if (!version) return {};
  return { format: 'Python Bytecode', pythonVersion: version };
}
