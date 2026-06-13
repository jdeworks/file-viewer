export function extract(intake) {
  let data, ok = true;
  try { data = JSON.parse(intake.text || ''); } catch { ok = false; }
  if (!ok) return [{ label: 'Valid JSON', value: 'no' }];
  let nodes = 0, maxDepth = 0;
  (function walk(v, d) {
    nodes++; if (d > maxDepth) maxDepth = d;
    if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], d + 1);
  })(data, 0);
  const root = Array.isArray(data) ? 'array' : (data === null ? 'null' : typeof data);
  return [
    { label: 'Valid JSON', value: 'yes' },
    { label: 'Root type', value: root },
    { label: 'Total nodes', value: String(nodes) },
    { label: 'Max depth', value: String(maxDepth) },
  ];
}
