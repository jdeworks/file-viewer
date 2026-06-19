export function metadata(intake) {
  const src = (intake.textSample || '').trim();
  const lines = src.split(/\r?\n/);
  const stages = [];
  const ports = new Set();
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    if (/^FROM\s/i.test(t)) {
      const rest = t.slice(5).trim();
      const as = rest.match(/^(.+?)\s+AS\s+(\S+)$/i);
      stages.push(as ? as[1].trim() : rest);
    } else if (/^EXPOSE\s/i.test(t)) {
      t.slice(7).trim().split(/\s+/).forEach(p => ports.add(p));
    }
  }
  if (!stages.length) return {};
  return {
    baseImage: stages[0],
    stageCount: stages.length,
    exposedPorts: [...ports].join(', ') || null,
  };
}
