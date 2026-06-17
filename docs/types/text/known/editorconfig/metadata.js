export function extract(intake) {
  let sections = 0, properties = 0, root = false;
  for (const raw of (intake.text || '').split(/\r?\n/)) {
    const line = raw.replace(/[;#].*$/, '').trim();
    if (!line) continue;
    if (/^\[.+\]$/.test(line)) { sections++; continue; }
    const m = line.match(/^([^=]+)=(.*)$/);
    if (!m) continue;
    properties++;
    if (/^root$/i.test(m[1].trim()) && /^true$/i.test(m[2].trim())) root = true;
  }
  return [
    { label: 'Sections', value: String(sections) },
    { label: 'Properties', value: String(properties) },
    { label: 'Root config', value: root ? 'yes' : 'no' },
  ];
}
