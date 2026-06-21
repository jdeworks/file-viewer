// XYZ meta-drawer fields: atom count, title/comment, element formula, bounding box, frame count.
function buildFormula(symbols) {
  const counts = {};
  for (const s of symbols) counts[s] = (counts[s] || 0) + 1;
  const order = ['C', 'H', 'N', 'O', 'S', 'P'];
  return Object.entries(counts)
    .sort(([a], [b]) => {
      const ai = order.indexOf(a), bi = order.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    })
    .map(([s, c]) => (c === 1 ? s : s + c))
    .join('');
}

export function extractMetadata(intake) {
  const text = intake.text || '';
  const lines = text.split(/\r?\n/);
  const fields = {};
  if (!/^\d+$/.test(lines[0]?.trim())) return fields;

  fields['Atom Count'] = lines[0].trim();
  if (lines[1]?.trim()) fields['Title'] = lines[1].trim();

  // Parse the first frame for formula + bbox; count all frames.
  const count = parseInt(lines[0].trim(), 10);
  const syms = [];
  const xs = [], ys = [], zs = [];
  for (let j = 0; j < count && 2 + j < lines.length; j++) {
    const parts = lines[2 + j].trim().split(/\s+/);
    if (parts.length >= 4) {
      syms.push(parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase());
      xs.push(parseFloat(parts[1])); ys.push(parseFloat(parts[2])); zs.push(parseFloat(parts[3]));
    }
  }
  if (syms.length) {
    fields['Formula'] = buildFormula(syms);
    fields['Elements'] = String(new Set(syms).size);
    const bbox = [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), Math.max(...zs) - Math.min(...zs)];
    if (bbox.every((v) => isFinite(v))) fields['Bounding Box'] = bbox.map((v) => v.toFixed(2)).join(' × ') + ' Å';
  }

  let frames = 0;
  for (let i = 0; i < lines.length; ) {
    const c = parseInt(lines[i]?.trim(), 10);
    if (!isNaN(c) && c > 0 && i + 1 + c < lines.length) { frames++; i += 2 + c; } else i++;
  }
  if (frames > 1) fields['Frames'] = String(frames);

  return fields;
}
