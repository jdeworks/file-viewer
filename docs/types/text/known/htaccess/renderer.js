const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.hta-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.hta-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#a855f7;color:#fff;vertical-align:middle;margin-right:8px;}
.hta-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.hta-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.hta-sec{margin:12px 0;}
.hta-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.hta-table{width:100%;border-collapse:collapse;font-size:13px;}
.hta-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.hta-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.hta-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.hta-kv{display:grid;grid-template-columns:max-content 1fr;gap:3px 12px;font-size:13px;}
.hta-kv dt{color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding-top:2px;}
.hta-kv dd{margin:0;font-family:ui-monospace,monospace;font-size:12px;}
.hta-list{margin:0;padding:0 0 0 0;list-style:none;font-size:13px;font-family:ui-monospace,monospace;}
.hta-list li{padding:3px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.hta-list li:last-child{border-bottom:none;}
`;

function parseHtaccess(text) {
  const rewriteEngine = { on: false };
  const rewriteConds = [];
  const rewriteRules = [];
  const redirects = [];
  const auth = [];
  const options = [];
  const headers = [];

  // Pending conditions to attach to the next RewriteRule
  let pendingConds = [];

  const lines = (text || '').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    // RewriteEngine
    if (/^RewriteEngine\s+/i.test(line)) {
      rewriteEngine.on = /on/i.test(line.replace(/^RewriteEngine\s+/i, ''));
      continue;
    }

    // RewriteCond
    const condM = line.match(/^RewriteCond\s+(\S+)\s+(\S+)(?:\s+\[([^\]]+)\])?/i);
    if (condM) {
      pendingConds.push({ testString: condM[1], condition: condM[2], flags: condM[3] || '' });
      rewriteConds.push({ testString: condM[1], condition: condM[2], flags: condM[3] || '' });
      continue;
    }

    // RewriteRule
    const ruleM = line.match(/^RewriteRule\s+(\S+)\s+(\S+)(?:\s+\[([^\]]+)\])?/i);
    if (ruleM) {
      rewriteRules.push({ pattern: ruleM[1], substitution: ruleM[2], flags: ruleM[3] || '', conds: pendingConds });
      pendingConds = [];
      continue;
    }

    // Redirect / RedirectMatch
    const redirM = line.match(/^(Redirect(?:Match)?)\s+(?:(permanent|temp|seeother|\d{3})\s+)?(\S+)\s+(\S+)/i);
    if (redirM) {
      redirects.push({ directive: redirM[1], status: redirM[2] || '302', from: redirM[3], to: redirM[4] });
      continue;
    }

    // Auth directives
    if (/^(AuthType|AuthName|AuthUserFile|AuthGroupFile|Require)\s/i.test(line)) {
      const spaceIdx = line.indexOf(' ');
      auth.push({ key: line.slice(0, spaceIdx), value: line.slice(spaceIdx + 1).trim() });
      continue;
    }

    // Options / AllowOverride
    if (/^(Options|AllowOverride)\s/i.test(line)) {
      options.push(line);
      continue;
    }

    // Header / SetEnvIf / SetEnv
    if (/^(Header|SetEnvIf|SetEnv|RequestHeader)\s/i.test(line)) {
      headers.push(line);
    }
  }

  return { rewriteEngine, rewriteConds, rewriteRules, redirects, auth, options, headers };
}

function summaryText(p) {
  const parts = [];
  if (p.rewriteRules.length) parts.push(`${p.rewriteRules.length} rewrite rule${p.rewriteRules.length !== 1 ? 's' : ''}`);
  if (p.redirects.length) parts.push(`${p.redirects.length} redirect${p.redirects.length !== 1 ? 's' : ''}`);
  if (p.auth.length) parts.push('auth enabled');
  if (p.options.length) parts.push(`${p.options.length} option${p.options.length !== 1 ? 's' : ''}`);
  if (p.headers.length) parts.push(`${p.headers.length} header/env directive${p.headers.length !== 1 ? 's' : ''}`);
  return parts.length ? parts.join(' · ') : 'no recognized directives';
}

function rewriteSection(rules) {
  if (!rules.length) return '';
  const rows = rules.map((r) => {
    const flagsHtml = r.flags
      ? r.flags.split(',').map((f) => `<span class="hta-chip">${esc(f.trim())}</span>`).join('')
      : '<span style="color:var(--fg-2,#888)">—</span>';
    const condsHtml = r.conds.length
      ? r.conds.map((c) => `<span class="hta-chip">${esc(c.testString)} ${esc(c.condition)}</span>`).join(' ')
      : '';
    return `<tr>
      <td>${esc(r.pattern)}</td>
      <td>${esc(r.substitution)}</td>
      <td>${flagsHtml}</td>
      ${condsHtml ? `<td>${condsHtml}</td>` : '<td style="color:var(--fg-2,#888)">—</td>'}
    </tr>`;
  }).join('');
  return `<div class="hta-sec"><h3>Rewrite Rules</h3>
    <table class="hta-table">
      <thead><tr><th>Pattern</th><th>Substitution</th><th>Flags</th><th>Conditions</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function redirectSection(redirects) {
  if (!redirects.length) return '';
  const rows = redirects.map((r) => {
    const statusLabel = { permanent: '301', temp: '302', seeother: '303' }[r.status.toLowerCase()] || r.status;
    return `<tr>
      <td><span class="hta-chip">${esc(statusLabel)}</span></td>
      <td>${esc(r.from)}</td>
      <td>${esc(r.to)}</td>
    </tr>`;
  }).join('');
  return `<div class="hta-sec"><h3>Redirects</h3>
    <table class="hta-table">
      <thead><tr><th>Status</th><th>From</th><th>To</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function authSection(auth) {
  if (!auth.length) return '';
  const items = auth.map((a) => `<dt>${esc(a.key)}</dt><dd>${esc(a.value)}</dd>`).join('');
  return `<div class="hta-sec"><h3>Auth Config</h3><dl class="hta-kv">${items}</dl></div>`;
}

function optionsSection(opts) {
  if (!opts.length) return '';
  const items = opts.map((o) => `<li>${esc(o)}</li>`).join('');
  return `<div class="hta-sec"><h3>Options</h3><ul class="hta-list">${items}</ul></div>`;
}

function headersSection(hdrs) {
  if (!hdrs.length) return '';
  const items = hdrs.map((h) => `<li>${esc(h)}</li>`).join('');
  return `<div class="hta-sec"><h3>Headers / Env</h3><ul class="hta-list">${items}</ul></div>`;
}

export function render(intake) {
  const parsed = parseHtaccess(intake.text);

  const host = document.createElement('div');
  host.className = 'hta-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="hta-title"><span class="hta-badge">Apache</span>.htaccess</div>
<div class="hta-sub">${esc(summaryText(parsed))}</div>
${rewriteSection(parsed.rewriteRules)}
${redirectSection(parsed.redirects)}
${authSection(parsed.auth)}
${optionsSection(parsed.options)}
${headersSection(parsed.headers)}`;

  return { parentNode: host };
}
