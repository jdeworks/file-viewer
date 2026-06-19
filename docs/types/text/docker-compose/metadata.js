export function metadata(intake) {
  const src = (intake.textSample || '').trim();
  const services = (src.match(/^  \w[\w-]*\s*:/gm) || []).map(l => l.trim().replace(/:.*/, ''));
  if (!services.length) return {};
  const ports = (src.match(/["']?\d+:\d+["']?/g) || []).map(p => p.replace(/["']/g, ''));
  return {
    serviceCount: services.length,
    services: services.slice(0, 10).join(', '),
    ports: [...new Set(ports)].slice(0, 8).join(', ') || null,
  };
}
