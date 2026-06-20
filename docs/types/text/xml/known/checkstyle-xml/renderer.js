const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cs-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-cs{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#528EBE;color:#fff;vertical-align:middle;margin-right:8px}
.cs-title{font-size:18px;font-weight:700;margin:0 0 4px}
.cs-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.cs-sec{margin:14px 0}
.cs-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.cs-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.cs-tree{margin:0;padding:0;list-style:none}
.cs-tree li{margin:2px 0}
.cs-module{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-size:12px;font-family:ui-monospace,monospace;cursor:default}
.cs-module.checker{background:#e0f0ff;border-color:#93c5fd;color:#1e3a5f;font-weight:700}
.cs-module.treewalker{background:#f0fdf4;border-color:#86efac;color:#14532d;font-weight:700}
.cs-prop-count{font-size:10px;color:var(--fg-2,#888);background:var(--bg,#fff);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:0 5px}
.cs-children{margin-left:24px;padding-left:12px;border-left:2px solid var(--border,#e0e0e0);margin-top:4px}
.cs-pills{display:flex;flex-wrap:wrap;gap:4px}
.cs-pill{display:inline-flex;align-items:center;gap:3px;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.cs-err{color:#b91c1c;font-size:13px;padding:8px 0}
.cs-table{width:100%;border-collapse:collapse;font-size:13px}
.cs-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.cs-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px}
.cs-table tr:last-child td{border-bottom:none}
.cs-sev{display:inline-block;font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;text-transform:uppercase}
.cs-sev.error{background:#fee2e2;border:1px solid #fca5a5;color:#991b1b}
.cs-sev.warning{background:#fef3c7;border:1px solid #fcd34d;color:#92400e}
.cs-sev.info{background:#dbeafe;border:1px solid #93c5fd;color:#1e40af}
.cs-sev.ignore{background:#f3f4f6;border:1px solid #d1d5db;color:#6b7280}
`;

function attr(el, name) {
  return (el.getAttribute(name) || '').trim();
}

function getProps(el) {
  return [...el.querySelectorAll(':scope > property')].map((p) => ({
    name: attr(p, 'name'),
    value: attr(p, 'value'),
  })).filter((p) => p.name);
}

function renderModule(el, depth) {
  const name = attr(el, 'name');
  const props = getProps(el);
  const children = [...el.querySelectorAll(':scope > module')];

  const nameLower = name.toLowerCase();
  const cls = nameLower === 'checker' ? 'checker' : nameLower === 'treewalker' ? 'treewalker' : '';
  const propCount = props.length ? `<span class="cs-prop-count">${props.length} prop${props.length !== 1 ? 's' : ''}</span>` : '';

  let childrenHtml = '';
  if (children.length && depth < 3) {
    const MAX = depth === 0 ? 200 : 50;
    childrenHtml = `<div class="cs-children">
${children.slice(0, MAX).map((c) => renderModule(c, depth + 1)).join('')}
${children.length > MAX ? `<div style="font-size:12px;color:var(--fg-2,#888);margin:2px 0">…and ${children.length - MAX} more</div>` : ''}
</div>`;
  } else if (children.length && depth >= 3) {
    childrenHtml = `<div class="cs-children"><span style="font-size:12px;color:var(--fg-2,#888)">${children.length} sub-module${children.length !== 1 ? 's' : ''}</span></div>`;
  }

  return `<div style="margin:3px 0">
<span class="cs-module ${cls}">${esc(name || '?')}${propCount}</span>
${childrenHtml}
</div>`;
}

export async function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const doc = new DOMParser().parseFromString(text, 'text/xml');

  if (doc.getElementsByTagName('parsererror').length) {
    const d = document.createElement('div');
    d.className = 'cs-doc';
    d.innerHTML = `<style>${CSS}</style><p class="cs-err">Could not parse as XML.</p>`;
    return { parentNode: d };
  }

  const root = doc.documentElement;
  const rootName = attr(root, 'name');
  const filename = (intake.name || intake.filename || '').split('/').pop() || 'checkstyle.xml';

  // Count all modules
  const allModules = [...doc.getElementsByTagName('module')];
  const totalModules = allModules.length;

  // Top-level checker properties
  const checkerProps = getProps(root);

  // All modules at TreeWalker level (for stats)
  const treewalkerEl = root.querySelector(':scope > module[name="TreeWalker"]');
  const twChildren = treewalkerEl ? [...treewalkerEl.querySelectorAll(':scope > module')] : [];
  const directChildren = [...root.querySelectorAll(':scope > module')];

  // Collect unique module names for summary pills
  const moduleNames = [...new Set(allModules.map((m) => attr(m, 'name')).filter((n) => n && n !== 'TreeWalker' && n !== 'Checker'))];

  // Severity breakdown
  const severities = {};
  checkerProps.concat(allModules.flatMap((m) => getProps(m))).forEach((p) => {
    if (p.name === 'severity') severities[p.value] = (severities[p.value] || 0) + 1;
  });

  const subParts = [
    `${totalModules} module${totalModules !== 1 ? 's' : ''}`,
    directChildren.length ? `${directChildren.length} top-level` : '',
    treewalkerEl ? `${twChildren.length} TreeWalker checks` : '',
  ].filter(Boolean).join(' · ');

  // Build module tree
  const treeHtml = `<div class="cs-sec"><h3>Module Tree</h3><div class="cs-card">
${renderModule(root, 0)}
</div></div>`;

  // Checker properties
  const propsHtml = checkerProps.length
    ? `<div class="cs-sec"><h3>Checker Properties</h3><div class="cs-card">
<table class="cs-table"><thead><tr><th>Name</th><th>Value</th></tr></thead><tbody>
${checkerProps.map((p) => `<tr><td style="color:var(--fg-2,#666)">${esc(p.name)}</td><td>${
    p.name === 'severity'
      ? `<span class="cs-sev ${esc(p.value.toLowerCase())}">${esc(p.value)}</span>`
      : esc(p.value)
  }</td></tr>`).join('')}
</tbody></table>
</div></div>` : '';

  // Module name pills (unique checks used)
  const SHOW_PILLS = 40;
  const pillsHtml = moduleNames.length
    ? `<div class="cs-sec"><h3>Check Modules Used (${moduleNames.length})</h3>
<div class="cs-pills">
${moduleNames.slice(0, SHOW_PILLS).map((n) => `<span class="cs-pill">${esc(n)}</span>`).join('')}
${moduleNames.length > SHOW_PILLS ? `<span class="cs-pill" style="color:var(--fg-2,#888)">+${moduleNames.length - SHOW_PILLS} more</span>` : ''}
</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'cs-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="cs-title"><span class="badge-cs">Checkstyle</span>${esc(filename)}</div>
<div class="cs-sub">${esc(subParts)}</div>
${treeHtml}
${propsHtml}
${pillsHtml}`;

  return { parentNode: host };
}
