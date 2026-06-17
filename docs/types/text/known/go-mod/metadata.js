export function extract(intake) {
  let modulePath = '', goVersion = '', toolchain = '', inRequire = false;
  let requires = 0, indirect = 0, replace = 0, exclude = 0;
  for (const raw of (intake.text || '').split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const line = trimmed.replace(/\/\/.*$/, '').trim();
    if (inRequire) {
      if (line === ')') { inRequire = false; continue; }
      if (line) { requires++; if (/\/\/\s*indirect/.test(trimmed)) indirect++; }
      continue;
    }
    let m;
    if ((m = line.match(/^module\s+(.+)$/))) modulePath = m[1].trim();
    else if ((m = line.match(/^go\s+([\d.]+)/))) goVersion = m[1];
    else if ((m = line.match(/^toolchain\s+(.+)$/))) toolchain = m[1].trim();
    else if (/^require\s*\($/.test(line)) inRequire = true;
    else if (/^require\s+/.test(line)) { requires++; if (/\/\/\s*indirect/.test(trimmed)) indirect++; }
    else if (/^replace\s+/.test(line)) replace++;
    else if (/^exclude\s+/.test(line)) exclude++;
  }
  return [
    ...(modulePath ? [{ label: 'Module', value: modulePath }] : []),
    ...(goVersion ? [{ label: 'Go version', value: goVersion }] : []),
    ...(toolchain ? [{ label: 'Toolchain', value: toolchain }] : []),
    { label: 'Requirements', value: String(requires) },
    { label: 'Indirect requirements', value: String(indirect) },
    { label: 'Replace directives', value: String(replace) },
    { label: 'Exclude directives', value: String(exclude) },
  ];
}
