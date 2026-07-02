function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function parseYamlLite(src) {
  // Minimal YAML parser for docker-compose structure
  const lines = src.split(/\r?\n/);
  const services = {};
  let inServices = false;
  let currentService = null;
  let currentBlock = null;
  let indent0 = 0;

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const indent = line.match(/^(\s*)/)[1].length;
    const trimmed = line.trim();

    if (/^services\s*:/.test(trimmed)) {
      inServices = true;
      indent0 = indent;
      continue;
    }
    if (inServices && indent <= indent0) {
      // Left the services block (a sibling top-level key like volumes/networks/secrets) —
      // stop treating its children (e.g. a named volume) as service entries.
      inServices = false;
      currentService = null;
      currentBlock = null;
    }
    if (inServices && indent === indent0 + 2 && /^\w[\w-]*\s*:/.test(trimmed)) {
      const name = trimmed.replace(/:.*/, '');
      currentService = { name, image: null, ports: [], volumes: [], depends: [], build: false };
      services[name] = currentService;
      currentBlock = null;
      continue;
    }
    if (!currentService) continue;
    if (indent === indent0 + 4) {
      if (/^image\s*:/.test(trimmed)) {
        currentService.image = trimmed.slice(6).trim().replace(/^["']|["']$/g, '');
      } else if (/^build\s*/.test(trimmed)) {
        currentService.build = true;
      } else if (/^ports\s*:/.test(trimmed)) {
        currentBlock = 'ports';
      } else if (/^volumes\s*:/.test(trimmed)) {
        currentBlock = 'volumes';
      } else if (/^depends_on\s*:/.test(trimmed)) {
        currentBlock = 'depends';
      } else {
        currentBlock = null;
      }
    } else if (indent >= indent0 + 6 && trimmed.startsWith('-')) {
      const val = trimmed.slice(1).trim().replace(/^["']|["']$/g, '');
      if (currentBlock === 'ports' && currentService.ports.length < 10) currentService.ports.push(val);
      if (currentBlock === 'volumes' && currentService.volumes.length < 6) currentService.volumes.push(val);
      if (currentBlock === 'depends' && currentService.depends.length < 6) currentService.depends.push(val);
    }
  }
  return services;
}

export function render(intake) {
  const src = (intake.text || intake.textSample || '').trim();
  const services = parseYamlLite(src);
  const names = Object.keys(services);

  const versionMatch = src.match(/^version\s*:\s*["']?([^\s"'\n]+)/m);
  const version = versionMatch ? versionMatch[1] : null;

  const allPorts = new Set();
  names.forEach(n => services[n].ports.forEach(p => allPorts.add(p.split(':').pop())));

  const svcHtml = names.map(name => {
    const s = services[name];
    const imageBadge = s.image
      ? `<span class="dc-image">${esc(s.image)}</span>`
      : s.build ? `<span class="dc-build">build</span>` : '';
    const portBadges = s.ports.slice(0, 5).map(p =>
      `<span class="dc-port">${esc(p)}</span>`
    ).join('');
    const depBadges = s.depends.map(d =>
      `<span class="dc-dep">→ ${esc(d)}</span>`
    ).join('');
    return `
      <div class="dc-service">
        <div class="dc-svc-name">${esc(name)}</div>
        <div class="dc-svc-meta">${imageBadge}${portBadges}${depBadges}</div>
        ${s.volumes.length ? `<div class="dc-volumes">${s.volumes.slice(0, 4).map(v => `<span class="dc-vol">${esc(v)}</span>`).join('')}</div>` : ''}
      </div>`;
  }).join('');

  const overviewHtml = `
    <div class="meta-row"><span class="meta-key">Services</span><span class="meta-val">${names.length}</span></div>
    ${version ? `<div class="meta-row"><span class="meta-key">Compose version</span><span class="meta-val">${esc(version)}</span></div>` : ''}
    ${allPorts.size ? `<div class="meta-row"><span class="meta-key">Host ports</span><span class="meta-val">${[...allPorts].map(p => `<span class="dc-port">${esc(p)}</span>`).join(' ')}</span></div>` : ''}
  `;

  return {
    bodyHtml: `
      <style>
        .badge-docker-compose { background: #1565c0; color: #fff; }
        .dc-service { margin:6px 0; padding:8px 10px; background:#f8f9fa; border-radius:5px; border-left:3px solid #1565c0; }
        .dc-svc-name { font-weight:bold; font-size:0.95rem; margin-bottom:4px; }
        .dc-svc-meta { display:flex; flex-wrap:wrap; gap:4px; }
        .dc-image { background:#e3f2fd; color:#0d47a1; border-radius:3px; padding:1px 6px; font-family:monospace; font-size:0.8rem; }
        .dc-build { background:#fff3e0; color:#e65100; border-radius:3px; padding:1px 6px; font-size:0.8rem; }
        .dc-port { background:#e8f5e9; color:#2e7d32; border-radius:3px; padding:1px 6px; font-family:monospace; font-size:0.8rem; }
        .dc-dep { background:#f3e5f5; color:#6a1b9a; border-radius:3px; padding:1px 6px; font-size:0.8rem; }
        .dc-volumes { margin-top:4px; }
        .dc-vol { display:inline-block; background:#f5f5f5; color:#546e7a; border-radius:3px; padding:1px 6px; font-family:monospace; font-size:0.75rem; margin:1px; }
      </style>
      <div class="badge-row"><span class="badge badge-docker-compose">docker-compose</span></div>
      <div class="meta-section">
        <h4 class="meta-section-title">Overview</h4>
        ${overviewHtml}
      </div>
      ${svcHtml ? `<div class="meta-section"><h4 class="meta-section-title">Services</h4>${svcHtml}</div>` : '<p style="color:#90a4ae">No services found</p>'}
    `,
    hadUnsafe: false,
  };
}
