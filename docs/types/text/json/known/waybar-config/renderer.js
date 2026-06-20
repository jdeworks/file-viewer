const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.waybar-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-waybar{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2b8fb3;color:#fff;vertical-align:middle;margin-right:8px}
.waybar-title{font-size:18px;font-weight:700;margin:0 0 4px}
.waybar-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.waybar-sec{margin:14px 0}
.waybar-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.waybar-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.waybar-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px}
.waybar-kv-k{color:var(--fg-2,#888);min-width:140px;flex-shrink:0}
.waybar-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.waybar-bar{display:flex;flex-direction:column;gap:4px;margin:4px 0}
.waybar-bar-row{display:flex;align-items:center;gap:8px}
.waybar-bar-label{font-size:11px;color:var(--fg-2,#888);min-width:80px;flex-shrink:0;text-align:right}
.waybar-modules{display:flex;flex-wrap:wrap;gap:5px;flex:1}
.waybar-mod{display:inline-block;font-size:11px;padding:2px 9px;border-radius:10px;background:var(--bg-2,#f0f6fc);border:1px solid var(--border,#d0d8e4);font-family:ui-monospace,monospace;color:var(--fg,#24292f)}
.waybar-mod-active{background:#e8f4fb;border-color:#2b8fb3;color:#1a6a8a}
.waybar-kv-table{width:100%;border-collapse:collapse;font-size:13px}
.waybar-kv-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.waybar-kv-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0)}
.waybar-mono{font:12px/1.4 ui-monospace,monospace}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="waybar-kv"><span class="waybar-kv-k">${esc(label)}</span><span class="waybar-kv-v">${esc(value)}</span></div>`;
}

function moduleRow(label, modules) {
  if (!Array.isArray(modules) || modules.length === 0) return '';
  const chips = modules.map((m) => `<span class="waybar-mod waybar-mod-active">${esc(m)}</span>`).join('');
  return `<div class="waybar-bar-row"><span class="waybar-bar-label">${esc(label)}</span><div class="waybar-modules">${chips}</div></div>`;
}

export function render(intake) {
  let cfg = {};
  try {
    cfg = JSON.parse(intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '{}'));
  } catch {
    cfg = {};
  }

  const modulesLeft = Array.isArray(cfg['modules-left']) ? cfg['modules-left'] : [];
  const modulesCenter = Array.isArray(cfg['modules-center']) ? cfg['modules-center'] : [];
  const modulesRight = Array.isArray(cfg['modules-right']) ? cfg['modules-right'] : [];
  const allModules = [...new Set([...modulesLeft, ...modulesCenter, ...modulesRight])];

  // General display settings
  const height = cfg.height != null ? String(cfg.height) : '';
  const layer = cfg.layer || '';
  const output = Array.isArray(cfg.output) ? cfg.output.join(', ') : (cfg.output || '');
  const spacing = cfg.spacing != null ? String(cfg.spacing) : '';
  const position = cfg.position || '';
  const marginTop = cfg['margin-top'] != null ? String(cfg['margin-top']) : '';
  const marginBottom = cfg['margin-bottom'] != null ? String(cfg['margin-bottom']) : '';
  const exclusive = cfg.exclusive != null ? String(cfg.exclusive) : '';
  const passthrough = cfg.passthrough != null ? String(cfg.passthrough) : '';

  const displayRows = [
    kv('height', height ? `${height}px` : ''),
    kv('layer', layer),
    kv('position', position),
    kv('output', output),
    kv('spacing', spacing ? `${spacing}px` : ''),
    kv('margin-top', marginTop ? `${marginTop}px` : ''),
    kv('margin-bottom', marginBottom ? `${marginBottom}px` : ''),
    kv('exclusive', exclusive),
    kv('passthrough', passthrough),
  ].filter(Boolean).join('');

  // Module details — show interesting settings for known modules
  const moduleDetailRows = [];

  // Clock
  if (cfg.clock) {
    const c = cfg.clock;
    const parts = [
      c.format ? `format: ${c.format}` : '',
      c.interval ? `interval: ${c.interval}s` : '',
      c.tooltip ? `tooltip: ${c.tooltip}` : '',
    ].filter(Boolean);
    if (parts.length) moduleDetailRows.push(`<tr><td class="waybar-mono">clock</td><td>${esc(parts.join(' · '))}</td></tr>`);
  }

  // CPU
  if (cfg.cpu) {
    const c = cfg.cpu;
    const parts = [
      c.format ? `format: ${c.format}` : '',
      c.interval ? `interval: ${c.interval}s` : '',
      c['format-icons'] ? `icons: ${Array.isArray(c['format-icons']) ? c['format-icons'].length + ' icons' : 'yes'}` : '',
    ].filter(Boolean);
    if (parts.length) moduleDetailRows.push(`<tr><td class="waybar-mono">cpu</td><td>${esc(parts.join(' · '))}</td></tr>`);
  }

  // Memory
  if (cfg.memory) {
    const c = cfg.memory;
    const parts = [
      c.format ? `format: ${c.format}` : '',
      c.interval ? `interval: ${c.interval}s` : '',
    ].filter(Boolean);
    if (parts.length) moduleDetailRows.push(`<tr><td class="waybar-mono">memory</td><td>${esc(parts.join(' · '))}</td></tr>`);
  }

  // Battery
  if (cfg.battery) {
    const b = cfg.battery;
    const stateCount = b.states ? Object.keys(b.states).length : 0;
    const parts = [
      b.format ? `format: ${b.format}` : '',
      b['format-charging'] ? `charging: ${b['format-charging']}` : '',
      stateCount ? `${stateCount} states` : '',
    ].filter(Boolean);
    if (parts.length) moduleDetailRows.push(`<tr><td class="waybar-mono">battery</td><td>${esc(parts.join(' · '))}</td></tr>`);
  }

  // Network
  if (cfg.network) {
    const n = cfg.network;
    const parts = [
      n.format ? `format: ${n.format}` : '',
      n['format-wifi'] ? `wifi: ${n['format-wifi']}` : '',
      n['format-disconnected'] ? `disconnected format set` : '',
    ].filter(Boolean);
    if (parts.length) moduleDetailRows.push(`<tr><td class="waybar-mono">network</td><td>${esc(parts.join(' · '))}</td></tr>`);
  }

  // Pulseaudio
  if (cfg.pulseaudio) {
    const p = cfg.pulseaudio;
    const parts = [
      p.format ? `format: ${p.format}` : '',
      p['format-muted'] ? `muted: ${p['format-muted']}` : '',
    ].filter(Boolean);
    if (parts.length) moduleDetailRows.push(`<tr><td class="waybar-mono">pulseaudio</td><td>${esc(parts.join(' · '))}</td></tr>`);
  }

  // Tray
  if (cfg.tray) {
    const t = cfg.tray;
    const parts = [
      t.spacing != null ? `spacing: ${t.spacing}px` : '',
      t['icon-size'] != null ? `icon-size: ${t['icon-size']}` : '',
    ].filter(Boolean);
    if (parts.length) moduleDetailRows.push(`<tr><td class="waybar-mono">tray</td><td>${esc(parts.join(' · '))}</td></tr>`);
  }

  const totalModules = allModules.length;
  const subParts = [
    totalModules ? `${totalModules} module${totalModules !== 1 ? 's' : ''}` : '',
    height ? `height ${height}px` : '',
    layer || '',
  ].filter(Boolean);

  const layoutHtml = (modulesLeft.length || modulesCenter.length || modulesRight.length)
    ? `<div class="waybar-sec"><h3>Module Layout</h3><div class="waybar-card"><div class="waybar-bar">
${moduleRow('left', modulesLeft)}
${moduleRow('center', modulesCenter)}
${moduleRow('right', modulesRight)}
</div></div></div>`
    : '';

  const displayHtml = displayRows
    ? `<div class="waybar-sec"><h3>Display Settings</h3><div class="waybar-card">${displayRows}</div></div>`
    : '';

  const moduleDetailHtml = moduleDetailRows.length
    ? `<div class="waybar-sec"><h3>Module Settings</h3><table class="waybar-kv-table"><thead><tr><th>Module</th><th>Settings</th></tr></thead><tbody>${moduleDetailRows.join('')}</tbody></table></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'waybar-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="waybar-title"><span class="badge-waybar">Waybar</span>Waybar Configuration</div>
<div class="waybar-sub">${esc(subParts.join(' · ') || 'Status bar configuration')}</div>
${layoutHtml}
${displayHtml}
${moduleDetailHtml}`;

  return { parentNode: host };
}
