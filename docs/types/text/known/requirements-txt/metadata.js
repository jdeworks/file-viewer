export function extract(intake) {
  let packages = 0, pinned = 0, options = 0, editable = 0, includes = 0;
  for (const raw of (intake.text || '').split(/\r?\n/)) {
    const body = raw.replace(/\s+#.*$/, '').trim();
    if (!body || body.startsWith('#')) continue;
    if (/^(-r|--requirement|-c|--constraint)\b/.test(body)) { includes++; options++; continue; }
    if (/^(-e|--editable)\b/.test(body)) { editable++; options++; continue; }
    if (/^-/.test(body)) { options++; continue; }
    packages++;
    if (/[<>=~!]=?/.test(body)) pinned++;
  }
  return [
    { label: 'Packages', value: String(packages) },
    { label: 'Pinned/constrained', value: String(pinned) },
    { label: 'Options', value: String(options) },
    { label: 'Editable installs', value: String(editable) },
    { label: 'Included files', value: String(includes) },
  ];
}
