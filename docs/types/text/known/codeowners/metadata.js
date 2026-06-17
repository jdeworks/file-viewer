export function extract(intake) {
  const owners = new Set();
  let rules = 0, comments = 0, noOwner = 0;
  for (const raw of (intake.text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) { comments++; continue; }
    const parts = line.split(/\s+/);
    parts.shift();
    if (!parts.length) noOwner++;
    parts.forEach((o) => owners.add(o));
    rules++;
  }
  return [
    { label: 'Rules', value: String(rules) },
    { label: 'Owners', value: String(owners.size) },
    { label: 'Comment lines', value: String(comments) },
    ...(noOwner ? [{ label: 'Rules without owner', value: String(noOwner) }] : []),
  ];
}
