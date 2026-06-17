export function extract(intake) {
  let gems = 0, groups = 0, source = '', ruby = '';
  const groupNames = new Set();
  for (const raw of (intake.text || '').split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    let m;
    if ((m = line.match(/^source\s+['"]([^'"]+)['"]/))) source = m[1];
    else if ((m = line.match(/^ruby\s+['"]([^'"]+)['"]/))) ruby = m[1];
    else if ((m = line.match(/^group\s+(.+?)\s+do\s*$/))) {
      m[1].split(',').map((g) => g.replace(/[:'"]/g, '').trim()).filter(Boolean).forEach((g) => groupNames.add(g));
    } else if (/^gem\s+['"][^'"]+['"]/.test(line)) gems++;
  }
  groups = groupNames.size;
  return [
    ...(ruby ? [{ label: 'Ruby version', value: ruby }] : []),
    ...(source ? [{ label: 'Source', value: source }] : []),
    { label: 'Gems', value: String(gems) },
    { label: 'Groups', value: String(groups) },
  ];
}
