const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nfsexp-doc{padding:16px 18px;max-width:960px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.nfsexp-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4B5563;color:#fff;vertical-align:middle;margin-right:8px;}
.nfsexp-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.nfsexp-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.nfsexp-table{width:100%;border-collapse:collapse;font-size:13px;margin-top:4px;}
.nfsexp-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding:6px 10px 6px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.nfsexp-table td{padding:6px 10px 6px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.nfsexp-path{font-weight:700;color:var(--fg,#24292f);}
.nfsexp-clients{display:flex;flex-direction:column;gap:6px;}
.nfsexp-client-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.nfsexp-client-name{color:var(--fg,#24292f);}
.nfsexp-chip{display:inline-block;padding:1px 6px;border-radius:8px;font-size:11px;font-weight:600;}
.nfsexp-chip-rw{background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7;}
.nfsexp-chip-ro{background:#FEF3C7;color:#92400E;border:1px solid #FCD34D;}
.nfsexp-chip-sync{background:#DBEAFE;color:#1E40AF;border:1px solid #93C5FD;}
.nfsexp-chip-async{background:#F3F4F6;color:#374151;border:1px solid #D1D5DB;}
.nfsexp-chip-squash{background:#FEF9C3;color:#854D0E;border:1px solid #FDE047;}
.nfsexp-chip-nosub{background:#F3F4F6;color:#374151;border:1px solid #D1D5DB;}
.nfsexp-chip-other{background:var(--bg-2,#f6f8fa);color:var(--fg-2,#888);border:1px solid var(--border,#e0e0e0);}
.nfsexp-warn{margin-top:14px;padding:10px 14px;background:#FEF2F2;border:1px solid #FECACA;border-radius:6px;font-size:12px;color:#991B1B;}
`;

function parseExports(text) {
  // Join continuation lines (lines ending with \)
  const joined = text.replace(/\\\n\s*/g, ' ');
  const exports = [];

  for (const raw of joined.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // Path is the first token; rest is client specs
    const m = line.match(/^(\S+)\s+(.*)/);
    if (!m) continue;
    const path = m[1];
    const rest = m[2].trim();

    // Parse one or more client(options) specs
    const clientSpecs = [];
    // e.g. 192.168.1.0/24(rw,sync) hostname(ro,sync)
    const specRe = /(\S+?)\(([^)]*)\)/g;
    let match;
    let found = false;
    while ((match = specRe.exec(rest)) !== null) {
      found = true;
      const client = match[1];
      const opts = match[2].split(',').map(o => o.trim()).filter(Boolean);
      clientSpecs.push({ client, opts });
    }
    // Fallback: client with no options parens (unusual but handle gracefully)
    if (!found && rest) {
      clientSpecs.push({ client: rest, opts: [] });
    }

    exports.push({ path, clientSpecs });
  }

  return exports;
}

function renderOpts(opts) {
  return opts.map(o => {
    const ol = o.toLowerCase();
    if (ol === 'rw') return `<span class="nfsexp-chip nfsexp-chip-rw">rw</span>`;
    if (ol === 'ro') return `<span class="nfsexp-chip nfsexp-chip-ro">ro</span>`;
    if (ol === 'sync') return `<span class="nfsexp-chip nfsexp-chip-sync">sync</span>`;
    if (ol === 'async') return `<span class="nfsexp-chip nfsexp-chip-async">async</span>`;
    if (ol === 'root_squash') return `<span class="nfsexp-chip nfsexp-chip-squash">root_squash</span>`;
    if (ol === 'no_root_squash') return `<span class="nfsexp-chip nfsexp-chip-other">no_root_squash</span>`;
    if (ol === 'no_subtree_check' || ol === 'subtree_check') return `<span class="nfsexp-chip nfsexp-chip-nosub">${esc(o)}</span>`;
    return `<span class="nfsexp-chip nfsexp-chip-other">${esc(o)}</span>`;
  }).join(' ');
}

export function render(intake) {
  const exports = parseExports(intake.text || '');

  // Detect security warning: no_root_squash + wildcard client
  const hasRootSquashWildcard = exports.some(e =>
    e.clientSpecs.some(cs =>
      cs.client === '*' && cs.opts.some(o => o.toLowerCase() === 'no_root_squash')
    )
  );

  const tableRows = exports.map(e => {
    const clientsHtml = `<div class="nfsexp-clients">
${e.clientSpecs.map(cs => `<div class="nfsexp-client-row">
  <span class="nfsexp-client-name">${esc(cs.client)}</span>
  ${renderOpts(cs.opts)}
</div>`).join('')}
</div>`;
    return `<tr>
  <td><span class="nfsexp-path">${esc(e.path)}</span></td>
  <td>${clientsHtml}</td>
</tr>`;
  }).join('');

  const warnHtml = hasRootSquashWildcard
    ? `<div class="nfsexp-warn">Warning: wildcard client (<code>*</code>) with <code>no_root_squash</code> grants root access from any host — review carefully</div>`
    : '';

  const host = document.createElement('div');
  host.className = 'nfsexp-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="nfsexp-title"><span class="nfsexp-badge">NFS</span>NFS Exports</div>
<div class="nfsexp-sub">${exports.length} export entr${exports.length !== 1 ? 'ies' : 'y'}</div>
${exports.length ? `<table class="nfsexp-table">
  <thead><tr>
    <th>Path</th>
    <th>Clients &amp; Options</th>
  </tr></thead>
  <tbody>${tableRows}</tbody>
</table>` : '<p style="color:var(--fg-2,#888);font-size:13px;">No exports found.</p>'}
${warnHtml}`;
  return { parentNode: host };
}
