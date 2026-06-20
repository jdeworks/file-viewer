const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.htaccess-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.htaccess-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#cc0000;color:#fff;vertical-align:middle;margin-right:8px;}
.htaccess-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.htaccess-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.htaccess-sec{margin:12px 0;}
.htaccess-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.htaccess-table{width:100%;border-collapse:collapse;font-size:13px;}
.htaccess-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.htaccess-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.htaccess-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.htaccess-kv{display:grid;grid-template-columns:max-content 1fr;gap:3px 12px;font-size:13px;}
.htaccess-kv dt{color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding-top:2px;}
.htaccess-kv dd{margin:0;font-family:ui-monospace,monospace;font-size:12px;}
.htaccess-list{margin:0;padding:0;list-style:none;font-size:13px;font-family:ui-monospace,monospace;}
.htaccess-list li{padding:3px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.htaccess-list li:last-child{border-bottom:none;}
.htaccess-status{display:inline-block;font-size:11px;padding:2px 7px;border-radius:8px;background:#fff3cd;border:1px solid #ffc107;font-family:ui-monospace,monospace;color:#856404;}
.htaccess-rewrite-on{color:#1a7f37;font-weight:600;}
.htaccess-rewrite-off{color:var(--fg-2,#888);}
`;

function parseHtaccess(text) {
  const rewriteEngine = { on: false, found: false };
  const rewriteConds = [];
  const rewriteRules = [];
  const redirects = [];
  const auth = [];
  const options = [];
  const headers = [];
  const errorDocs = [];
  const directoryIndex = [];
  const setEnvIf = [];

  let pendingConds = [];

  const lines = (text || '').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    // RewriteEngine
    if (/^RewriteEngine\s+/i.test(line)) {
      rewriteEngine.found = true;
      rewriteEngine.on = /on/i.test(line.replace(/^RewriteEngine\s+/i, ''));
      continue;
    }

    // RewriteCond
    const condM = line.match(/^RewriteCond\s+(\S+)\s+(\S+)(?:\s+\[([^\]]+)\])?/i);
    if (condM) {
      const cond = { testString: condM[1], condition: condM[2], flags: condM[3] || '' };
      pendingConds.push(cond);
      rewriteConds.push(cond);
      continue;
    }

    // RewriteRule
    const ruleM = line.match(/^RewriteRule\s+(\S+)\s+(\S+)(?:\s+\[([^\]]+)\])?/i);
    if (ruleM) {
      rewriteRules.push({ pattern: ruleM[1], substitution: ruleM[2], flags: ruleM[3] || '', conds: pendingConds });
      pendingConds = [];
      continue;
    }

    // Redirect / RedirectMatch / RedirectPermanent
    const redirM = line.match(/^(RedirectPermanent|RedirectMatch|Redirect)\s+(?:(permanent|temp|seeother|\d{3})\s+)?(\S+)\s+(\S+)/i);
    if (redirM) {
      const status = redirM[1].toLowerCase() === 'redirectpermanent' ? '301' : (redirM[2] || '302');
      redirects.push({ directive: redirM[1], status, from: redirM[3], to: redirM[4] });
      continue;
    }

    // ErrorDocument
    const errM = line.match(/^ErrorDocument\s+(\d+)\s+(.+)/i);
    if (errM) {
      errorDocs.push({ code: errM[1], target: errM[2].trim() });
      continue;
    }

    // DirectoryIndex
    const diM = line.match(/^DirectoryIndex\s+(.+)/i);
    if (diM) {
      directoryIndex.push(...diM[1].trim().split(/\s+/));
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

    // SetEnvIf
    if (/^SetEnvIf\s/i.test(line)) {
      setEnvIf.push(line);
      continue;
    }

    // Header / RequestHeader / SetEnv
    if (/^(Header|SetEnv|RequestHeader)\s/i.test(line)) {
      headers.push(line);
    }
  }

  return { rewriteEngine, rewriteConds, rewriteRules, redirects, auth, options, headers, errorDocs, directoryIndex, setEnvIf };
}

function summaryText(p) {
  const parts = [];
  if (p.rewriteRules.length) parts.push(`${p.rewriteRules.length} rewrite rule${p.rewriteRules.length !== 1 ? 's' : ''}`);
  if (p.redirects.length) parts.push(`${p.redirects.length} redirect${p.redirects.length !== 1 ? 's' : ''}`);
  if (p.auth.length) parts.push('auth enabled');
  if (p.options.length) parts.push(`${p.options.length} option${p.options.length !== 1 ? 's' : ''}`);
  if (p.headers.length) parts.push(`${p.headers.length} header/env directive${p.headers.length !== 1 ? 's' : ''}`);
  if (p.errorDocs.length) parts.push(`${p.errorDocs.length} error page${p.errorDocs.length !== 1 ? 's' : ''}`);
  return parts.length ? parts.join(' · ') : 'no recognized directives';
}

function rewriteSection(engine, rules) {
  const engineHtml = engine.found
    ? `<div class="htaccess-sec"><h3>Rewrite Engine</h3><span class="${engine.on ? 'htaccess-rewrite-on' : 'htaccess-rewrite-off'}">${engine.on ? 'On' : 'Off'}</span></div>`
    : '';
  if (!rules.length) return engineHtml;
  const shown = rules.slice(0, 10);
  const rows = shown.map((r) => {
    const flagsHtml = r.flags
      ? r.flags.split(',').map((f) => `<span class="htaccess-chip">${esc(f.trim())}</span>`).join('')
      : '<span style="color:var(--fg-2,#888)">—</span>';
    const condsHtml = r.conds.length
      ? r.conds.map((c) => `<span class="htaccess-chip">${esc(c.testString)} ${esc(c.condition)}</span>`).join(' ')
      : '<span style="color:var(--fg-2,#888)">—</span>';
    return `<tr>
      <td>${esc(r.pattern)}</td>
      <td>${esc(r.substitution)}</td>
      <td>${flagsHtml}</td>
      <td>${condsHtml}</td>
    </tr>`;
  }).join('');
  const more = rules.length > 10 ? `<p style="font-size:12px;color:var(--fg-2,#888);margin:4px 0 0">${rules.length - 10} more rule${rules.length - 10 !== 1 ? 's' : ''} not shown</p>` : '';
  return `${engineHtml}<div class="htaccess-sec"><h3>Rewrite Rules</h3>
    <table class="htaccess-table">
      <thead><tr><th>Pattern</th><th>Substitution</th><th>Flags</th><th>Conditions</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>${more}
  </div>`;
}

function redirectSection(redirects) {
  if (!redirects.length) return '';
  const rows = redirects.map((r) => {
    const statusLabel = { permanent: '301', temp: '302', seeother: '303' }[r.status.toLowerCase()] || r.status;
    return `<tr>
      <td><span class="htaccess-status">${esc(statusLabel)}</span></td>
      <td>${esc(r.from)}</td>
      <td>${esc(r.to)}</td>
    </tr>`;
  }).join('');
  return `<div class="htaccess-sec"><h3>Redirects</h3>
    <table class="htaccess-table">
      <thead><tr><th>Status</th><th>From</th><th>To</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function authSection(auth) {
  if (!auth.length) return '';
  const items = auth.map((a) => `<dt>${esc(a.key)}</dt><dd>${esc(a.value)}</dd>`).join('');
  return `<div class="htaccess-sec"><h3>Auth Config</h3><dl class="htaccess-kv">${items}</dl></div>`;
}

function optionsSection(opts) {
  if (!opts.length) return '';
  const items = opts.map((o) => `<li>${esc(o)}</li>`).join('');
  return `<div class="htaccess-sec"><h3>Options</h3><ul class="htaccess-list">${items}</ul></div>`;
}

function headersSection(hdrs) {
  if (!hdrs.length) return '';
  const shown = hdrs.slice(0, 5);
  const items = shown.map((h) => `<li>${esc(h)}</li>`).join('');
  const more = hdrs.length > 5 ? `<li style="color:var(--fg-2,#888)">${hdrs.length - 5} more…</li>` : '';
  return `<div class="htaccess-sec"><h3>Headers / Env</h3><ul class="htaccess-list">${items}${more}</ul></div>`;
}

function errorDocSection(errorDocs) {
  if (!errorDocs.length) return '';
  const rows = errorDocs.map((e) => `<tr><td><span class="htaccess-chip">${esc(e.code)}</span></td><td>${esc(e.target)}</td></tr>`).join('');
  return `<div class="htaccess-sec"><h3>Error Pages</h3>
    <table class="htaccess-table">
      <thead><tr><th>Code</th><th>Target</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function directoryIndexSection(di) {
  if (!di.length) return '';
  const chips = di.map((f) => `<span class="htaccess-chip">${esc(f)}</span>`).join('');
  return `<div class="htaccess-sec"><h3>Directory Index</h3>${chips}</div>`;
}

function setEnvIfSection(entries) {
  if (!entries.length) return '';
  const shown = entries.slice(0, 5);
  const items = shown.map((h) => `<li>${esc(h)}</li>`).join('');
  const more = entries.length > 5 ? `<li style="color:var(--fg-2,#888)">${entries.length - 5} more…</li>` : '';
  return `<div class="htaccess-sec"><h3>SetEnvIf</h3><ul class="htaccess-list">${items}${more}</ul></div>`;
}

export function render(intake) {
  const parsed = parseHtaccess(intake.text);

  const host = document.createElement('div');
  host.className = 'htaccess-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="htaccess-title"><span class="htaccess-badge">Apache .htaccess</span></div>
<div class="htaccess-sub">${esc(summaryText(parsed))}</div>
${rewriteSection(parsed.rewriteEngine, parsed.rewriteRules)}
${redirectSection(parsed.redirects)}
${authSection(parsed.auth)}
${optionsSection(parsed.options)}
${headersSection(parsed.headers)}
${setEnvIfSection(parsed.setEnvIf)}
${errorDocSection(parsed.errorDocs)}
${directoryIndexSection(parsed.directoryIndex)}`;

  return { parentNode: host };
}
