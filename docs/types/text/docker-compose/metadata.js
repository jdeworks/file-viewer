export function metadata(intake) {
  const src = (intake.textSample || '').trim();
  const lines = src.split(/\r?\n/);
  const startIdx = lines.findIndex(l => /^services\s*:/.test(l));
  if (startIdx === -1) return {};
  // Scope to the services: block only — stop at the next sibling top-level key
  // (volumes:, networks:, secrets:, configs:) so those aren't counted as services.
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (lines[i].trim() && /^\S/.test(lines[i])) { endIdx = i; break; }
  }
  const block = lines.slice(startIdx + 1, endIdx).join('\n');
  const services = (block.match(/^  \w[\w-]*\s*:/gm) || []).map(l => l.trim().replace(/:.*/, ''));
  if (!services.length) return {};
  const ports = (block.match(/["']?\d+:\d+["']?/g) || []).map(p => p.replace(/["']/g, ''));
  return {
    serviceCount: services.length,
    services: services.slice(0, 10).join(', '),
    ports: [...new Set(ports)].slice(0, 8).join(', ') || null,
  };
}
