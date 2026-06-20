const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.wslcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.wslcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0078d4;color:#fff;vertical-align:middle;margin-right:8px;}
.wslcfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.wslcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.wslcfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:12px 16px;margin-bottom:12px;}
.wslcfg-card-hd{font-family:ui-monospace,monospace;font-size:13px;font-weight:700;color:var(--fg,#24292f);margin:0 0 8px;padding-bottom:6px;border-bottom:1px solid var(--border,#e0e0e0);}
.wslcfg-table{width:100%;border-collapse:collapse;font-size:13px;}
.wslcfg-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:middle;}
.wslcfg-table tr:last-child td{border-bottom:none;}
.wslcfg-table td:first-child{color:var(--fg-2,#666);width:38%;white-space:nowrap;font-family:ui-monospace,monospace;font-size:12px;}
.wslcfg-val{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg,#24292f);word-break:break-word;}
.wslcfg-chip{display:inline-block;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:600;}
.wslcfg-chip-on{background:#d4edda;color:#155724;border:1px solid #c3e6cb;}
.wslcfg-chip-off{background:#e2e3e5;color:#383d41;border:1px solid #d6d8db;}
.wslcfg-chip-neutral{background:#d1ecf1;color:#0c5460;border:1px solid #bee5eb;}
.wslcfg-empty{color:var(--fg-2,#888);font-size:12px;font-style:italic;}
`;

function parseIni(text) {
  const sections = new Map();
  let current = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const secMatch = line.match(/^\[([^\]]+)\]$/);
    if (secMatch) {
      current = secMatch[1].toLowerCase();
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    const kvMatch = line.match(/^([^=]+?)\s*=\s*(.*)$/);
    if (kvMatch && current) {
      sections.get(current).push([kvMatch[1].trim().toLowerCase(), kvMatch[2].trim()]);
    }
  }
  return sections;
}

function getVal(entries, key) {
  const found = (entries || []).find(([k]) => k === key.toLowerCase());
  return found ? found[1] : null;
}

function chip(val, trueLabel, falseLabel) {
  const isTrue = val === 'true' || val === '1' || val === 'yes';
  const label = isTrue ? (trueLabel || val) : (falseLabel || val);
  const cls = isTrue ? 'wslcfg-chip-on' : 'wslcfg-chip-off';
  return `<span class="wslcfg-chip ${cls}">${esc(label)}</span>`;
}

function neutralChip(label) {
  return `<span class="wslcfg-chip wslcfg-chip-neutral">${esc(label)}</span>`;
}

function renderSection(title, rows) {
  const rowsHtml = rows.filter(Boolean).join('');
  return `<div class="wslcfg-card">
<div class="wslcfg-card-hd">${esc(title)}</div>
${rowsHtml ? `<table class="wslcfg-table"><tbody>${rowsHtml}</tbody></table>` : '<p class="wslcfg-empty">No settings in this section.</p>'}
</div>`;
}

function row(label, content) {
  return `<tr><td>${esc(label)}</td><td>${content}</td></tr>`;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const sections = parseIni(text);

  const cards = [];
  const sectionNames = [...sections.keys()];

  // [automount]
  if (sections.has('automount')) {
    const e = sections.get('automount');
    const enabled = getVal(e, 'enabled');
    const root = getVal(e, 'root');
    const options = getVal(e, 'options');
    const mountFsTab = getVal(e, 'mountfstab');
    const crossDistro = getVal(e, 'crossdistro');

    const rows = [];
    if (enabled != null) rows.push(row('enabled', chip(enabled, 'enabled', 'disabled')));
    if (root != null) rows.push(row('root', `<span class="wslcfg-val">${esc(root)}</span>`));
    if (options != null) rows.push(row('options', `<span class="wslcfg-val">${esc(options)}</span>`));
    if (mountFsTab != null) rows.push(row('mountFsTab', chip(mountFsTab, 'mount /etc/fstab', 'skip fstab')));
    if (crossDistro != null) rows.push(row('crossDistro', chip(crossDistro, 'cross-distro', 'off')));

    cards.push(renderSection('[automount] — Drive Mounting', rows));
  }

  // [network]
  if (sections.has('network')) {
    const e = sections.get('network');
    const genHosts = getVal(e, 'generatehosts');
    const genResolv = getVal(e, 'generateresolvconf');
    const hostname = getVal(e, 'hostname');

    const rows = [];
    if (genHosts != null) rows.push(row('generateHosts', chip(genHosts, 'auto-generate /etc/hosts', 'manual hosts')));
    if (genResolv != null) rows.push(row('generateResolvConf', chip(genResolv, 'auto-generate resolv.conf', 'manual DNS')));
    if (hostname != null) rows.push(row('hostname', neutralChip(hostname)));

    cards.push(renderSection('[network] — Network Settings', rows));
  }

  // [interop]
  if (sections.has('interop')) {
    const e = sections.get('interop');
    const enabled = getVal(e, 'enabled');
    const appendPath = getVal(e, 'appendwindowspath');

    const rows = [];
    if (enabled != null) rows.push(row('enabled', chip(enabled, 'Windows executables from Linux', 'interop disabled')));
    if (appendPath != null) rows.push(row('appendWindowsPath', chip(appendPath, 'Windows PATH included', 'Windows PATH excluded')));

    cards.push(renderSection('[interop] — Windows Interoperability', rows));
  }

  // [boot]
  if (sections.has('boot')) {
    const e = sections.get('boot');
    const systemd = getVal(e, 'systemd');
    const command = getVal(e, 'command');

    const rows = [];
    if (systemd != null) rows.push(row('systemd', chip(systemd, 'systemd enabled', 'no systemd')));
    if (command != null) rows.push(row('command', `<span class="wslcfg-val">${esc(command)}</span>`));

    cards.push(renderSection('[boot] — Boot Settings', rows));
  }

  // [wsl2]
  if (sections.has('wsl2')) {
    const e = sections.get('wsl2');
    const rows = e.map(([k, v]) => row(k, `<span class="wslcfg-val">${esc(v)}</span>`));
    cards.push(renderSection('[wsl2] — WSL2 VM Settings', rows));
  }

  // unknown sections
  for (const sec of sectionNames) {
    if (['automount', 'network', 'interop', 'boot', 'wsl2'].includes(sec)) continue;
    const e = sections.get(sec);
    const rows = e.map(([k, v]) => row(k, `<span class="wslcfg-val">${esc(v)}</span>`));
    cards.push(renderSection(`[${sec}]`, rows));
  }

  const hasSystemd = sections.has('boot') && getVal(sections.get('boot'), 'systemd') === 'true';
  const hasAutomount = sections.has('automount');
  const subParts = [];
  if (hasSystemd) subParts.push('systemd');
  if (hasAutomount) {
    const root = getVal(sections.get('automount'), 'root');
    if (root) subParts.push(`mounts at ${root}`);
  }
  if (sections.has('network')) {
    const hostname = getVal(sections.get('network'), 'hostname');
    if (hostname) subParts.push(`hostname: ${hostname}`);
  }

  const host = document.createElement('div');
  host.className = 'wslcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="wslcfg-title"><span class="wslcfg-badge">WSL2</span>WSL Config</div>
<div class="wslcfg-sub">${esc(subParts.join(' · ') || 'Windows Subsystem for Linux configuration')}</div>
${cards.join('') || '<p class="wslcfg-empty">No sections found.</p>'}`;

  return { parentNode: host };
}
