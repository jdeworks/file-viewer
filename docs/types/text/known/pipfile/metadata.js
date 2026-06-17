export function extract(intake) {
  const sections = parseSections(intake.text || '');
  const requires = sections.get('requires') || [];
  const py = requires.find((r) => /python_version|python_full_version/.test(r.name));
  return [
    ...(py ? [{ label: 'Python version', value: py.version }] : []),
    { label: 'Packages', value: String((sections.get('packages') || []).length) },
    { label: 'Dev packages', value: String((sections.get('dev-packages') || []).length) },
    { label: 'Sections', value: String(sections.size) },
  ];
}

function parseSections(text) {
  const sections = new Map();
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    let m;
    if ((m = line.match(/^\[([^\]]+)\]$/))) { current = m[1].trim(); sections.set(current, sections.get(current) || []); continue; }
    if (current && (m = line.match(/^["']?([A-Za-z0-9._-]+)["']?\s*=\s*(.+)$/))) {
      let version = m[2].trim();
      const vm = version.match(/version\s*=\s*["']([^"']+)["']/);
      version = vm ? vm[1] : version.replace(/^["']|["']$/g, '');
      sections.get(current).push({ name: m[1], version });
    }
  }
  return sections;
}
