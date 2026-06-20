const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.vclcfg-doc{padding:16px 18px;max-width:960px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.vclcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#006A63;color:#fff;vertical-align:middle;margin-right:8px;}
.vclcfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.vclcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.vclcfg-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;}
.vclcfg-chip{display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;background:var(--bg-2,#f0f4f8);color:var(--fg,#24292f);border:1px solid var(--border,#d0d7de);}
.vclcfg-chip-version{background:#e8f5f4;color:#006A63;border-color:#006A63;}
.vclcfg-chip-vmod{background:#f0f4ff;color:#1565C0;border-color:#1565C0;}
.vclcfg-chip-recv{background:#e3f2fd;color:#1565C0;border-color:#1565C0;}
.vclcfg-chip-hash{background:#f3e5f5;color:#7B1FA2;border-color:#7B1FA2;}
.vclcfg-chip-hit{background:#e8f5e9;color:#2E7D32;border-color:#2E7D32;}
.vclcfg-chip-miss{background:#fff3e0;color:#E65100;border-color:#E65100;}
.vclcfg-chip-pass{background:#f5f5f5;color:#555;border-color:#bbb;}
.vclcfg-chip-backend-response{background:#e8f5f4;color:#006A63;border-color:#006A63;}
.vclcfg-chip-deliver{background:#263238;color:#fff;border-color:#263238;}
.vclcfg-chip-other{background:#fafafa;color:#444;border-color:#ccc;}
.vclcfg-section{margin-bottom:16px;}
.vclcfg-section-hd{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.vclcfg-table{width:100%;border-collapse:collapse;font-size:13px;}
.vclcfg-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:5px 8px;border-bottom:2px solid var(--border,#e0e0e0);}
.vclcfg-table td{padding:6px 8px;border-bottom:1px solid var(--border,#eee);font-family:ui-monospace,monospace;font-size:12px;vertical-align:top;}
.vclcfg-table tr:last-child td{border-bottom:none;}
.vclcfg-acl-list{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px;}
.vclcfg-acl-list li{font-family:ui-monospace,monospace;font-size:12px;background:var(--bg-2,#f6f8fa);padding:2px 8px;border-radius:4px;border:1px solid var(--border,#e0e0e0);}
`;

const SUB_CHIP_CLASS = {
  vcl_recv: 'vclcfg-chip-recv',
  vcl_hash: 'vclcfg-chip-hash',
  vcl_hit: 'vclcfg-chip-hit',
  vcl_miss: 'vclcfg-chip-miss',
  vcl_pass: 'vclcfg-chip-pass',
  vcl_backend_response: 'vclcfg-chip-backend-response',
  vcl_deliver: 'vclcfg-chip-deliver',
};

function parseVcl(text) {
  const result = {
    version: null,
    vmods: [],
    backends: [],
    directors: [],
    subroutines: [],
    acls: [],
  };

  // VCL version: vcl 4.1;
  const verMatch = text.match(/^\s*vcl\s+([\d.]+)\s*;/m);
  if (verMatch) result.version = verMatch[1];

  // import MODULE;
  const importRe = /^\s*import\s+(\w+)\s*;/gm;
  let m;
  while ((m = importRe.exec(text)) !== null) {
    result.vmods.push(m[1]);
  }

  // backend NAME { ... }
  const backendRe = /^\s*backend\s+(\w+)\s*\{([^}]*)\}/gm;
  while ((m = backendRe.exec(text)) !== null) {
    const name = m[1];
    const body = m[2];
    const hostMatch = body.match(/\.host\s*=\s*"([^"]*)"/);
    const portMatch = body.match(/\.port\s*=\s*"([^"]*)"/);
    result.backends.push({
      name,
      host: hostMatch ? hostMatch[1] : '',
      port: portMatch ? portMatch[1] : '',
    });
  }

  // director NAME type { ... }
  const directorRe = /^\s*(?:new\s+\w+\s*=\s*)?directors\.(\w+)\s*\(/gm;
  const directorVarRe = /^\s*new\s+(\w+)\s*=\s*directors\.\w+\s*\(/gm;
  while ((m = directorVarRe.exec(text)) !== null) {
    result.directors.push(m[1]);
  }

  // sub NAME { ... } — find all subroutines
  const subRe = /^\s*sub\s+(\w+)\s*\{/gm;
  while ((m = subRe.exec(text)) !== null) {
    result.subroutines.push(m[1]);
  }

  // acl NAME { ... }
  const aclRe = /^\s*acl\s+(\w+)\s*\{([^}]*)\}/gm;
  while ((m = aclRe.exec(text)) !== null) {
    const name = m[1];
    const body = m[2];
    const entries = [];
    const entryRe = /"([^"]+)"/g;
    let em;
    while ((em = entryRe.exec(body)) !== null) {
      entries.push(em[1]);
    }
    // also capture /mask notation like "192.168.1.0"/24
    const maskRe = /"([^"]+)"\/(\d+)/g;
    let mm;
    while ((mm = maskRe.exec(body)) !== null) {
      // replace already-added bare entry with the masked form
      const bare = entries.findIndex(e => e === mm[1]);
      if (bare !== -1) entries[bare] = `${mm[1]}/${mm[2]}`;
    }
    result.acls.push({ name, entries });
  }

  return result;
}

export function render(intake) {
  const text = intake.text || '';
  const parsed = parseVcl(text);

  const versionHtml = parsed.version
    ? `<span class="vclcfg-chip vclcfg-chip-version">VCL ${esc(parsed.version)}</span>`
    : '';

  const vmodsHtml = parsed.vmods.length
    ? parsed.vmods.map(v => `<span class="vclcfg-chip vclcfg-chip-vmod">${esc(v)}</span>`).join('')
    : '';

  const subChips = parsed.subroutines.map(name => {
    const cls = SUB_CHIP_CLASS[name] || 'vclcfg-chip-other';
    return `<span class="vclcfg-chip ${cls}">${esc(name)}</span>`;
  }).join('');

  const backendsHtml = parsed.backends.length
    ? `<div class="vclcfg-section">
<div class="vclcfg-section-hd">Backends (${parsed.backends.length})</div>
<table class="vclcfg-table">
<thead><tr><th>Name</th><th>Host</th><th>Port</th></tr></thead>
<tbody>${parsed.backends.map(b => `<tr>
  <td>${esc(b.name)}</td>
  <td>${esc(b.host)}</td>
  <td>${esc(b.port)}</td>
</tr>`).join('')}</tbody>
</table>
</div>`
    : '';

  const subHtml = subChips
    ? `<div class="vclcfg-section">
<div class="vclcfg-section-hd">Overridden Subroutines (${parsed.subroutines.length})</div>
<div class="vclcfg-chips">${subChips}</div>
</div>`
    : '';

  const aclsHtml = parsed.acls.length
    ? `<div class="vclcfg-section">
<div class="vclcfg-section-hd">ACLs</div>
${parsed.acls.map(a => `<div style="margin-bottom:10px;">
  <div style="font-size:13px;font-weight:600;margin-bottom:4px;">${esc(a.name)}</div>
  <ul class="vclcfg-acl-list">${a.entries.map(e => `<li>${esc(e)}</li>`).join('')}</ul>
</div>`).join('')}
</div>`
    : '';

  const summaryParts = [];
  if (parsed.backends.length) summaryParts.push(`${parsed.backends.length} backend${parsed.backends.length !== 1 ? 's' : ''}`);
  if (parsed.subroutines.length) summaryParts.push(`${parsed.subroutines.length} subroutine${parsed.subroutines.length !== 1 ? 's' : ''}`);
  if (parsed.vmods.length) summaryParts.push(`${parsed.vmods.length} VMOD${parsed.vmods.length !== 1 ? 's' : ''}`);
  if (parsed.acls.length) summaryParts.push(`${parsed.acls.length} ACL${parsed.acls.length !== 1 ? 's' : ''}`);

  const host = document.createElement('div');
  host.className = 'vclcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="vclcfg-title"><span class="vclcfg-badge">Varnish</span>Varnish VCL Configuration</div>
<div class="vclcfg-sub">${summaryParts.join(' · ') || 'No entries detected'}</div>
<div class="vclcfg-chips">${versionHtml}${vmodsHtml}</div>
${backendsHtml}
${subHtml}
${aclsHtml}`;

  return { parentNode: host };
}
