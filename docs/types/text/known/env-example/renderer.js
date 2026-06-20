const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.envex-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-envex{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#ECD53F;color:#1a1a1a;vertical-align:middle;margin-right:8px}
.envex-title{font-size:18px;font-weight:700;margin:0 0 4px}
.envex-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.envex-sec{margin:14px 0}
.envex-sec-header{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);margin:0 0 6px;padding:4px 0;border-bottom:1px solid var(--border,#e0e0e0)}
.envex-table{width:100%;border-collapse:collapse;font-size:13px}
.envex-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.envex-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top}
.envex-key{font:13px/1.4 ui-monospace,monospace;font-weight:600;color:var(--fg,#24292f)}
.envex-val{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);word-break:break-all}
.envex-empty{font:12px/1.4 ui-monospace,monospace;color:var(--fg-3,#bbb);font-style:italic}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const lines = text.split('\n');

  // Parse into sections: each comment block starts a new section
  // A section has an optional header (from comments) and an array of vars
  const sections = [];
  let currentHeader = null;
  let currentVars = [];
  let pendingComments = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      // blank line flushes pending comments only if no vars follow immediately
      if (currentVars.length > 0) {
        sections.push({ header: currentHeader, vars: currentVars });
        currentHeader = null;
        currentVars = [];
        pendingComments = [];
      }
      continue;
    }
    if (line.startsWith('#')) {
      const comment = line.replace(/^#+\s*/, '');
      pendingComments.push(comment);
      continue;
    }
    const eq = line.indexOf('=');
    if (eq > 0) {
      // Flush pending comments as the header for this group if we have no vars yet
      if (currentVars.length === 0 && pendingComments.length > 0) {
        currentHeader = pendingComments.join(' ');
        pendingComments = [];
      } else {
        pendingComments = [];
      }
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      currentVars.push({ key, val });
    } else {
      pendingComments = [];
    }
  }
  if (currentVars.length > 0) {
    sections.push({ header: currentHeader, vars: currentVars });
  }

  const totalVars = sections.reduce((n, s) => n + s.vars.length, 0);

  const sectionsHtml = sections.map((sec) => {
    const headerHtml = sec.header
      ? `<div class="envex-sec-header">${esc(sec.header)}</div>`
      : '';
    const rows = sec.vars.map((v) => {
      const valHtml = v.val
        ? `<span class="envex-val">${esc(v.val)}</span>`
        : `<span class="envex-empty">(empty)</span>`;
      return `<tr><td><span class="envex-key">${esc(v.key)}</span></td><td>${valHtml}</td></tr>`;
    }).join('');
    return `<div class="envex-sec">${headerHtml}<table class="envex-table"><thead><tr><th>Variable</th><th>Placeholder value</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }).join('');

  const host = document.createElement('div');
  host.className = 'envex-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="envex-title"><span class="badge-envex">ENV</span>Environment Template</div>
<div class="envex-sub">${totalVars} variable${totalVars !== 1 ? 's' : ''} — placeholder values shown (not real secrets)</div>
${sectionsHtml || '<div style="color:var(--fg-2,#888);font-size:13px">No variables found</div>'}`;
  return { parentNode: host };
}
