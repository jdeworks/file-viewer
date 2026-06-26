import { ensureKnownUiStyle, issueList, sourcePreview, wireSourceLinks } from '../../../../../core/known-ui.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.fbs-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-fbs{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f57c00;color:#fff;vertical-align:middle;margin-right:8px;}
.fbs-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.fbs-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.fbs-sec{margin:12px 0;}
.fbs-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.fbs-grid{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:8px 0;}
.fbs-key{font-size:12px;color:var(--fg-2,#888);}
.fbs-val{font:12px ui-monospace,monospace;color:var(--accent,#0969da);}
.fbs-pill{display:inline-block;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:2px 8px;font:12px ui-monospace,monospace;margin:2px;}
.fbs-pill.emu{background:#fff3e0;border-color:#ffb74d;color:#e65100;}
.fbs-table{width:100%;border-collapse:collapse;font-size:13px;}
.fbs-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.fbs-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.fbs-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;}
.fbs-link:hover{color:var(--accent,#0969da);}
.fbs-json-key{color:#0550ae;font-weight:700;}
.fbs-json-string{color:#0a7f38;}
`;

const HELP = {
  hosting: 'Firebase Hosting public assets, rewrites, redirects, and headers.',
  rewrites: 'Hosting rewrite rules. Broad catch-alls are common for SPAs but can shadow static files or functions.',
  redirects: 'Hosting redirects and their HTTP status codes.',
  headers: 'Custom response headers applied to hosting paths.',
  functions: 'Cloud Functions source, runtime, and predeploy commands.',
  emulators: 'Local emulator ports used during development.',
  services: 'Configured Firebase services such as Firestore and Storage rules.',
  source: 'Open this Firebase setting in source.',
};

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function lineContaining(text, pattern, fallbackLine = 1) {
  const rx = pattern instanceof RegExp ? pattern : new RegExp(escapeRegExp(pattern));
  const lines = String(text || '').split(/\r?\n/);
  const idx = lines.findIndex((line) => rx.test(line));
  return idx >= 0 ? idx + 1 : fallbackLine;
}

function keyLine(text, key, fallbackLine = 1) {
  return lineContaining(text, new RegExp(`"${escapeRegExp(key)}"\\s*:`), fallbackLine);
}

function valueLine(text, key, value, fallbackLine = 1) {
  if (value == null || value === '') return keyLine(text, key, fallbackLine);
  return lineContaining(text, new RegExp(`"${escapeRegExp(key)}"\\s*:\\s*"?${escapeRegExp(value)}\\b`), keyLine(text, key, fallbackLine));
}

function helpFor(key) {
  return HELP[key] || HELP.source;
}

function lineButton(label, line, key = 'source') {
  const title = `${helpFor(key)} Open line ${line || 1} in source.`;
  return `<button class="fbs-link" type="button" data-source-line="${line || 1}" title="${esc(title)}">${esc(label)}</button>`;
}

function row(label, value, line, help) {
  if (value == null || value === '') return '';
  return `<span class="fbs-key">${lineButton(label, line, help)}</span><span class="fbs-val">${lineButton(value, line, help)}</span>`;
}

function collectIssues(cfg, text) {
  const issues = [];
  const hosting = cfg.hosting || {};
  const rewrites = Array.isArray(hosting.rewrites) ? hosting.rewrites : [];
  const headers = Array.isArray(hosting.headers) ? hosting.headers : [];
  const functions = cfg.functions || {};
  if (hosting.public == null) {
    issues.push({ severity: 'warning', label: 'hosting', line: keyLine(text, 'hosting'), message: 'Hosting has no public directory configured.' });
  }
  for (const rewrite of rewrites) {
    const source = rewrite.source || '';
    if (source === '**' || source === '/**' || source.includes('**')) {
      issues.push({ severity: 'warning', label: 'rewrite', line: valueLine(text, 'source', source, keyLine(text, 'rewrites')), message: `${source} is a broad hosting rewrite; confirm it is ordered after explicit routes.` });
    }
    if (rewrite.function && !/^\/api/.test(source)) {
      issues.push({ severity: 'info', label: 'function', line: valueLine(text, 'function', rewrite.function, keyLine(text, 'rewrites')), message: `${source} invokes function ${rewrite.function}; check region and auth expectations.` });
    }
  }
  const headerKeys = new Set(headers.flatMap((rule) => (rule.headers || []).map((h) => String(h.key || '').toLowerCase())));
  if (!headerKeys.has('content-security-policy')) {
    issues.push({ severity: 'warning', label: 'headers', line: keyLine(text, 'headers'), message: 'No Content-Security-Policy header is configured for hosting.' });
  }
  if (!headerKeys.has('strict-transport-security')) {
    issues.push({ severity: 'warning', label: 'headers', line: keyLine(text, 'headers'), message: 'No Strict-Transport-Security header is configured for hosting.' });
  }
  if (/nodejs(10|12|14|16|18)$/i.test(functions.runtime || '')) {
    issues.push({ severity: 'warning', label: 'runtime', line: valueLine(text, 'runtime', functions.runtime), message: `${functions.runtime} may be outdated; verify Firebase Functions runtime support before deploying.` });
  }
  const emulators = cfg.emulators || {};
  for (const [name, config] of Object.entries(emulators)) {
    if (name === 'ui') continue;
    if (config && typeof config === 'object' && config.host && !/^(localhost|127\.0\.0\.1|::1)$/.test(String(config.host))) {
      issues.push({ severity: 'warning', label: 'emulator', line: valueLine(text, 'host', config.host, keyLine(text, name)), message: `${name} emulator binds to ${config.host}; avoid exposing local emulators on public interfaces.` });
    }
  }
  return issues;
}

function highlightJsonLine(line) {
  const raw = esc(line);
  return raw
    .replace(/^(\s*)"([^"]+)"(\s*:)/, `$1<span class="fbs-json-key">"$2"</span>$3`)
    .replace(/(:\s*)"([^"]*)"/, `$1<span class="fbs-json-string">"$2"</span>`);
}

function renderRules(title, items, text, help, columns) {
  if (!items.length) return '';
  return `<div class="fbs-sec"><h3>${lineButton(`${title} (${items.length})`, keyLine(text, title.toLowerCase()), help)}</h3><table class="fbs-table"><thead><tr>${columns.map((c) => `<th>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${items.map((item) => `<tr>${columns.map((c) => {
    const value = c.value(item);
    const line = c.line ? c.line(item) : valueLine(text, c.key, value, keyLine(text, title.toLowerCase()));
    return `<td>${lineButton(value || '-', line, help)}</td>`;
  }).join('')}</tr>`).join('')}</tbody></table></div>`;
}

export function render(intake) {
  const text = intake.text || '';
  let cfg = {};
  try { cfg = JSON.parse(text || '{}'); } catch { cfg = {}; }
  ensureKnownUiStyle(document);

  const hosting = cfg.hosting || null;
  const functions = cfg.functions || null;
  const emulators = cfg.emulators || null;
  const firestore = cfg.firestore || null;
  const storage = cfg.storage || null;
  const rewrites = Array.isArray(hosting?.rewrites) ? hosting.rewrites : [];
  const redirects = Array.isArray(hosting?.redirects) ? hosting.redirects : [];
  const headers = Array.isArray(hosting?.headers) ? hosting.headers : [];
  const emuKeys = emulators ? Object.keys(emulators).filter((k) => k !== 'ui') : [];

  let html = `<style>${CSS}</style>
<div class="fbs-title"><span class="badge-fbs">${lineButton('Firebase', 1, 'source')}</span>${lineButton('firebase.json', 1, 'source')}</div>
<div class="fbs-sub">Firebase project configuration</div>`;

  if (hosting) {
    html += `<div class="fbs-sec"><h3>${lineButton('Hosting', keyLine(text, 'hosting'), 'hosting')}</h3><div class="fbs-grid">
${row('Public dir', hosting.public, valueLine(text, 'public', hosting.public, keyLine(text, 'hosting')), 'hosting')}
${row('Rewrites', rewrites.length || '', keyLine(text, 'rewrites'), 'rewrites')}
${row('Redirects', redirects.length || '', keyLine(text, 'redirects'), 'redirects')}
${row('Header rules', headers.length || '', keyLine(text, 'headers'), 'headers')}
</div></div>`;
  }

  html += renderRules('Rewrites', rewrites, text, 'rewrites', [
    { label: 'Source', key: 'source', value: (r) => r.source || '' },
    { label: 'Target', key: 'destination', value: (r) => r.destination || (r.function ? `function:${r.function}` : '') },
  ]);
  html += renderRules('Redirects', redirects, text, 'redirects', [
    { label: 'Source', key: 'source', value: (r) => r.source || '' },
    { label: 'Destination', key: 'destination', value: (r) => r.destination || '' },
    { label: 'Status', key: 'type', value: (r) => r.type || '' },
  ]);
  html += renderRules('Headers', headers, text, 'headers', [
    { label: 'Source', key: 'source', value: (r) => r.source || '' },
    { label: 'Headers', key: 'headers', value: (r) => (r.headers || []).map((h) => h.key).join(', ') },
  ]);

  if (functions) {
    html += `<div class="fbs-sec"><h3>${lineButton('Functions', keyLine(text, 'functions'), 'functions')}</h3><div class="fbs-grid">
${row('Source', functions.source, valueLine(text, 'source', functions.source, keyLine(text, 'functions')), 'functions')}
${row('Runtime', functions.runtime, valueLine(text, 'runtime', functions.runtime, keyLine(text, 'functions')), 'functions')}
${Array.isArray(functions.predeploy) ? row('Predeploy', functions.predeploy.join(', '), keyLine(text, 'predeploy'), 'functions') : ''}
</div></div>`;
  }

  if (emuKeys.length) {
    html += `<div class="fbs-sec"><h3>${lineButton('Emulators', keyLine(text, 'emulators'), 'emulators')}</h3><div>`;
    for (const key of emuKeys) {
      const port = emulators[key]?.port;
      html += `<span class="fbs-pill emu">${lineButton(`${key}${port ? `:${port}` : ''}`, valueLine(text, 'port', port, keyLine(text, key)), 'emulators')}</span>`;
    }
    html += '</div></div>';
  }

  if (firestore || storage) {
    html += `<div class="fbs-sec"><h3>${lineButton('Services', Math.min(firestore ? keyLine(text, 'firestore') : Infinity, storage ? keyLine(text, 'storage') : Infinity), 'services')}</h3><div>`;
    if (firestore) html += `<span class="fbs-pill">${lineButton('firestore', keyLine(text, 'firestore'), 'services')}</span>`;
    if (storage) html += `<span class="fbs-pill">${lineButton('storage', keyLine(text, 'storage'), 'services')}</span>`;
    html += '</div></div>';
  }

  const host = document.createElement('div');
  host.className = 'fbs-doc';
  host.innerHTML = html;
  const review = issueList(collectIssues(cfg, text), { title: 'Firebase Review' });
  if (review) host.appendChild(review);
  host.appendChild(sourcePreview(text, {
    title: 'Source',
    collapsed: true,
    idPrefix: 'firebase-line',
    highlighter: highlightJsonLine,
  }));
  wireSourceLinks(host, { idPrefix: 'firebase-line' });
  return { parentNode: host };
}
