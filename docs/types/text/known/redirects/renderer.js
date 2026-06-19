const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rdx-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-rdx{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00c7b7;color:#fff;vertical-align:middle;margin-right:8px;}
.rdx-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.rdx-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.rdx-table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px;}
.rdx-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px 4px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.rdx-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.rdx-status{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:700;font-family:ui-monospace,monospace;}
.rdx-status.s301{background:#fef9c3;color:#713f12;}
.rdx-status.s302{background:#fef3c7;color:#92400e;}
.rdx-status.s200{background:#dcfce7;color:#166534;}
.rdx-status.s404{background:#fee2e2;color:#991b1b;}
.rdx-status.s410{background:#f3e8ff;color:#6b21a8;}
.rdx-status.other{background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.rdx-force{font-size:10px;background:#dbeafe;color:#1e40af;padding:1px 5px;border-radius:6px;margin-left:4px;vertical-align:middle;}
`;

function parseRules(text) {
  const rules = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    const from = parts[0];
    const to = parts[1];
    let status = 301;
    let force = false;
    if (parts[2]) {
      const sm = /^(\d{3})(!?)$/.exec(parts[2]);
      if (sm) { status = parseInt(sm[1], 10); force = sm[2] === '!'; }
    }
    rules.push({ from, to, status, force });
  }
  return rules;
}

function statusClass(code) {
  if (code === 301) return 's301';
  if (code === 302) return 's302';
  if (code === 200) return 's200';
  if (code === 404) return 's404';
  if (code === 410) return 's410';
  return 'other';
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const rules = parseRules(text);

  const host = document.createElement('div');
  host.className = 'rdx-doc';

  const rows = rules.slice(0, 200).map((r) =>
    `<tr><td>${esc(r.from)}</td><td>${esc(r.to)}</td><td><span class="rdx-status ${statusClass(r.status)}">${esc(r.status)}</span>${r.force ? '<span class="rdx-force">!</span>' : ''}</td></tr>`
  ).join('');

  const tableHtml = rules.length
    ? `<table class="rdx-table"><thead><tr><th>From</th><th>To</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>${rules.length > 200 ? `<div style="font-size:12px;color:var(--fg-2,#888);margin-top:8px">Showing 200 of ${rules.length} rules</div>` : ''}`
    : '<div style="color:var(--fg-2,#888);font-size:13px">No redirect rules found</div>';

  host.innerHTML = `<style>${CSS}</style>
<div class="rdx-title"><span class="badge-rdx">Netlify</span>_redirects</div>
<div class="rdx-sub">${rules.length} redirect rule${rules.length !== 1 ? 's' : ''}</div>
${tableHtml}`;

  return { parentNode: host };
}
