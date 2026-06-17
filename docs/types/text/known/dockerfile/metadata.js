export function extract(intake) {
  const lines = logicalLines(intake.text || '');
  const instructions = new Map();
  let stages = 0;
  for (const line of lines) {
    const m = line.match(/^\s*([A-Za-z]+)\b/);
    if (!m) continue;
    const instr = m[1].toUpperCase();
    instructions.set(instr, (instructions.get(instr) || 0) + 1);
    if (instr === 'FROM') stages++;
  }
  return [
    { label: 'Instructions', value: String(lines.length) },
    { label: 'Build stages', value: String(stages) },
    { label: 'Instruction types', value: String(instructions.size) },
    ...(instructions.has('HEALTHCHECK') ? [{ label: 'Healthcheck', value: 'yes' }] : []),
  ];
}

function logicalLines(text) {
  const out = [];
  let buf = '';
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, '');
    if (/^\s*#/.test(line) || (!line.trim() && !buf)) continue;
    buf += (buf ? '\n' : '') + line;
    if (/\\$/.test(line)) { buf = buf.replace(/\\$/, ' '); continue; }
    if (buf.trim()) out.push(buf);
    buf = '';
  }
  if (buf.trim()) out.push(buf);
  return out;
}
