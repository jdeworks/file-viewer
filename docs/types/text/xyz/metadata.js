export function extractMetadata(intake) {
  const text = intake.text || '';
  const lines = text.split(/\r?\n/);
  const fields = {};
  if (/^\d+$/.test(lines[0]?.trim())) {
    fields['Atom Count'] = lines[0].trim();
    if (lines[1]?.trim()) fields['Title'] = lines[1].trim();
  }
  // Count frames (multi-XYZ)
  let frames = 0;
  const counts = [];
  for (let i = 0; i < lines.length; ) {
    const c = parseInt(lines[i]?.trim(), 10);
    if (!isNaN(c) && c > 0 && i + 1 + c < lines.length) {
      frames++;
      counts.push(c);
      i += 2 + c;
    } else { i++; }
  }
  if (frames > 1) fields['Frames'] = String(frames);
  return fields;
}
