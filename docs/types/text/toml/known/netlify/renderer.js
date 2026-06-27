import { ensureKnownUiStyle, issueList, maskedValue, sourcePreview, wireSourceLinks } from '../../../../../core/known-ui.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.netlifytoml-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif}
.netlifytoml-doc .badge-netlify{display:inline-block;background:#00c7b7;color:#fff;padding:2px 9px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.04em;margin-bottom:10px}
.netlifytoml-doc .ntl-grid{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:12px 0}
.netlifytoml-doc .ntl-key{color:var(--fg-2,#888);font-size:12px}
.netlifytoml-doc .ntl-val{font:12px ui-monospace,monospace;color:var(--accent,#0070f3);word-break:break-all}
.netlifytoml-doc .ntl-sec{margin:12px 0}
.netlifytoml-doc .ntl-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.netlifytoml-doc .ntl-pill{display:inline-block;background:var(--bg-3,#e8e8e8);border:1px solid var(--border,#d0d7de);border-radius:4px;padding:2px 8px;font:12px ui-monospace,monospace;margin:2px}
.netlifytoml-doc .ntl-table{width:100%;border-collapse:collapse;font-size:13px}
.netlifytoml-doc .ntl-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.netlifytoml-doc .ntl-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px;word-break:break-all}
.netlifytoml-doc .ntl-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px}
.netlifytoml-doc .ntl-link:hover{color:var(--accent,#0070f3)}
.netlifytoml-doc .ntl-dim{color:var(--fg-2,#888)}
.netlifytoml-doc .ntl-src-key{color:#0550ae;font-weight:700}
.netlifytoml-doc .ntl-src-section{color:#8250df;font-weight:700}
.netlifytoml-doc .ntl-src-comment{color:#6e7781;font-style:italic}
`;

const HELP = {
  build: 'Build command, publish directory, and functions directory used by Netlify deploys.',
  environment: 'Build-time environment variables from netlify.toml.',
  redirects: 'Netlify redirect and rewrite rules. Status 200 rewrites without changing the URL.',
  headers: 'Custom response headers applied to matching paths.',
  contexts: 'Deploy context overrides such as production and deploy-preview.',
  dev: 'Netlify Dev local command and ports.',
  source: 'Open this Netlify setting in source.',
};

const KNOWN_TOP_LEVEL_KEYS = new Set([
  'build', 'build.environment', 'context', 'dev', 'functions', 'headers',
  'headers.values', 'plugins', 'redirects',
]);

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function lineContaining(text, pattern, fallbackLine = 1) {
  const rx = pattern instanceof RegExp ? pattern : new RegExp(escapeRegExp(pattern));
  const lines = String(text || '').split(/\r?\n/);
  const idx = lines.findIndex((line) => rx.test(line));
  return idx >= 0 ? idx + 1 : fallbackLine;
}

function sectionLine(text, section, fallbackLine = 1) {
  const escaped = escapeRegExp(section);
  return lineContaining(text, new RegExp(`^\\s*\\[\\[?${escaped}\\]?\\]\\s*$`), fallbackLine);
}

function valueLine(text, key, value, fallbackLine = 1) {
  if (value == null || value === '') return lineContaining(text, new RegExp(`^\\s*${escapeRegExp(key)}\\s*=`), fallbackLine);
  return lineContaining(text, new RegExp(`^\\s*${escapeRegExp(key)}\\s*=\\s*["']?${escapeRegExp(value)}\\b`), fallbackLine);
}

function helpFor(key) {
  return HELP[key] || HELP.source;
}

function lineButton(label, line, key = 'source') {
  const title = `${helpFor(key)} Open line ${line || 1} in source.`;
  return `<button class="ntl-link" type="button" data-source-line="${line || 1}" title="${esc(title)}">${esc(label)}</button>`;
}

function scalarValue(raw) {
  const trimmed = String(raw || '').trim().replace(/\s+#.*$/, '');
  const quoted = /^(['"])([\s\S]*)\1$/.exec(trimmed);
  if (quoted) return quoted[2];
  if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === 'true';
  if (/^[+-]?\d+$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

function parseNetlifyToml(text) {
  const model = {
    build: {},
    env: [],
    redirects: [],
    headers: [],
    contexts: [],
    dev: {},
    unknownTopLevel: [],
  };
  let section = '';
  let current = null;
  let headerValues = null;

  for (const [idx, rawLine] of String(text || '').split(/\r?\n/).entries()) {
    const lineNo = idx + 1;
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const arraySection = /^\[\[([^\]]+)\]\]$/.exec(trimmed);
    const tableSection = /^\[([^\]]+)\]$/.exec(trimmed);
    if (arraySection) {
      section = arraySection[1];
      if (!isKnownTopLevelSection(section)) model.unknownTopLevel.push({ key: section, line: lineNo });
      headerValues = null;
      if (section === 'redirects') {
        current = { line: lineNo };
        model.redirects.push(current);
      } else if (section === 'headers') {
        current = { line: lineNo, values: [] };
        model.headers.push(current);
      } else {
        current = null;
      }
      continue;
    }
    if (tableSection) {
      section = tableSection[1];
      if (!isKnownTopLevelSection(section)) model.unknownTopLevel.push({ key: section, line: lineNo });
      current = null;
      headerValues = section === 'headers.values' ? model.headers[model.headers.length - 1] : null;
      if (section.startsWith('context.')) {
        const name = section.slice('context.'.length);
        current = { name, line: lineNo, values: [] };
        model.contexts.push(current);
      }
      continue;
    }
    const kv = /^([A-Za-z0-9_.-]+)\s*=\s*(.+)$/.exec(trimmed);
    if (!kv) continue;
    const key = kv[1];
    const value = scalarValue(kv[2]);
    const entry = { key, value, line: lineNo };
    if (section === 'build') model.build[key] = entry;
    else if (section === 'build.environment') model.env.push(entry);
    else if (section === 'redirects' && current) current[key] = value, current[`${key}Line`] = lineNo;
    else if (section === 'headers' && current) current[key] = value, current[`${key}Line`] = lineNo;
    else if (section === 'headers.values' && headerValues) headerValues.values.push(entry);
    else if (section.startsWith('context.') && current) current.values.push(entry);
    else if (section === 'dev') model.dev[key] = entry;
  }
  return model;
}

function isKnownTopLevelSection(section) {
  return KNOWN_TOP_LEVEL_KEYS.has(section) || section.startsWith('context.');
}

function maskedEnv(key, value) {
  const masked = maskedValue(key, value);
  const title = masked.reason ? ` title="${esc(masked.reason)}"` : '';
  return `<span${title}>${esc(masked.masked ? '[configured]' : masked.text)}</span>`;
}

function collectIssues(model) {
  const issues = [];
  for (const item of model.unknownTopLevel) {
    issues.push({ severity: 'info', label: 'unknown key', line: item.line, message: `[${item.key}] is not a common Netlify top-level section; check for a typo or unsupported setting.` });
  }
  if (!model.build.command) {
    issues.push({ severity: 'warning', label: 'build', line: sectionLine('', 'build'), message: 'No build command is configured.' });
  }
  if (!model.build.publish) {
    issues.push({ severity: 'warning', label: 'publish', line: model.build.command?.line || 1, message: 'No publish directory is configured.' });
  }
  const buildCommand = String(model.build.command?.value || '');
  if (/curl\s+.*\|\s*(sh|bash)|wget\s+.*\|\s*(sh|bash)|npm\s+install\s+-g/i.test(buildCommand)) {
    issues.push({ severity: 'warning', label: 'command', line: model.build.command.line, message: 'Build command runs downloaded or global code; review supply-chain risk.' });
  }
  for (const redirect of model.redirects) {
    if (Number(redirect.status) === 200 && /\/\*/.test(String(redirect.from || ''))) {
      issues.push({ severity: 'warning', label: 'rewrite', line: redirect.fromLine || redirect.line, message: `${redirect.from} is a broad rewrite; confirm it does not hide static files or function routes.` });
    }
    if (/^https?:\/\//i.test(String(redirect.to || ''))) {
      issues.push({ severity: 'info', label: 'external', line: redirect.toLine || redirect.line, message: `${redirect.from || '?'} sends traffic to an external origin.` });
    }
  }
  const headerNames = new Set(model.headers.flatMap((h) => h.values.map((v) => String(v.key).toLowerCase())));
  if (!headerNames.has('content-security-policy')) {
    issues.push({ severity: 'warning', label: 'headers', line: model.headers[0]?.line || 1, message: 'No Content-Security-Policy header is configured.' });
  }
  if (!headerNames.has('strict-transport-security')) {
    issues.push({ severity: 'warning', label: 'headers', line: model.headers[0]?.line || 1, message: 'No Strict-Transport-Security header is configured.' });
  }
  const broadHeader = model.headers.find((h) => h.for === '/*' || h.for === '/**' || h.for === '/*.*');
  if (model.headers.length && !broadHeader) {
    issues.push({ severity: 'info', label: 'headers', line: model.headers[0].line, message: 'Headers appear scoped to specific paths rather than all responses.' });
  }
  for (const env of model.env) {
    const masked = maskedValue(env.key, env.value);
    if (masked.masked) {
      issues.push({ severity: 'warning', label: 'secret', line: env.line, message: `${env.key} looks sensitive; store real values in Netlify environment variables, not source.` });
    }
  }
  return issues;
}

function redactSource(text) {
  return String(text || '').split(/\r?\n/).map((line) => {
    const m = line.match(/^(\s*)([A-Za-z0-9_.-]+)(\s*=\s*)(['"]?)(.*?)(\4)(\s*(?:#.*)?)$/);
    if (!m) return line;
    const masked = maskedValue(m[2], m[5]);
    return masked.masked ? `${m[1]}${m[2]}${m[3]}${m[4]}********${m[6]}${m[7]}` : line;
  }).join('\n');
}

function highlightTomlLine(line) {
  const raw = esc(line);
  return raw
    .replace(/^(\s*\[+)([^\]]+)(\]+\s*)$/, `$1<span class="ntl-src-section">$2</span>$3`)
    .replace(/^(\s*)([A-Za-z0-9_.-]+)(\s*=)/, `$1<span class="ntl-src-key">$2</span>$3`)
    .replace(/(#.*)$/, '<span class="ntl-src-comment">$1</span>');
}

function buildGrid(model) {
  const rows = [];
  const add = (label, entry, help = 'build') => {
    if (!entry) return;
    rows.push(`<span class="ntl-key">${lineButton(label, entry.line, help)}</span><span class="ntl-val">${lineButton(entry.value, entry.line, help)}</span>`);
  };
  add('Build command', model.build.command);
  add('Publish dir', model.build.publish);
  add('Functions dir', model.build.functions);
  add('Node version', model.env.find((e) => /^node_version$/i.test(e.key)), 'environment');
  if (model.redirects.length) rows.push(`<span class="ntl-key">${lineButton('Redirects', model.redirects[0].line, 'redirects')}</span><span class="ntl-val">${model.redirects.length}</span>`);
  if (model.headers.length) rows.push(`<span class="ntl-key">${lineButton('Custom headers', model.headers[0].line, 'headers')}</span><span class="ntl-val">${model.headers.length}</span>`);
  return rows.join('');
}

function sectionHtml(title, line, help, body) {
  return `<div class="ntl-sec"><h3>${lineButton(title, line, help)}</h3>${body}</div>`;
}

export function render(intake) {
  const text = intake.text || '';
  const model = parseNetlifyToml(text);
  ensureKnownUiStyle(document);

  const redirectsHtml = model.redirects.length
    ? sectionHtml(`Redirects (${model.redirects.length})`, model.redirects[0].line, 'redirects', `<table class="ntl-table"><thead><tr><th>From</th><th>To</th><th>Status</th></tr></thead><tbody>${model.redirects.map((r) => `<tr><td>${lineButton(r.from || '?', r.fromLine || r.line, 'redirects')}</td><td>${lineButton(r.to || '?', r.toLine || r.line, 'redirects')}</td><td>${lineButton(r.status || '-', r.statusLine || r.line, 'redirects')}</td></tr>`).join('')}</tbody></table>`)
    : '';

  const headersHtml = model.headers.length
    ? sectionHtml(`Headers (${model.headers.length})`, model.headers[0].line, 'headers', model.headers.map((h) => `<div style="margin:4px 0;font-size:12px"><span class="ntl-val">${lineButton(h.for || '?', h.forLine || h.line, 'headers')}</span> ${h.values.map((v) => `<span class="ntl-pill">${lineButton(v.key, v.line, 'headers')}</span>`).join('')}</div>`).join(''))
    : '';

  const contextsHtml = model.contexts.length
    ? sectionHtml('Deploy contexts', model.contexts[0].line, 'contexts', model.contexts.map((ctx) => `<span class="ntl-pill">${lineButton(ctx.name, ctx.line, 'contexts')}${ctx.values.length ? ` <span class="ntl-dim">${ctx.values.map((v) => esc(v.key)).join(', ')}</span>` : ''}</span>`).join(''))
    : '';

  const envHtml = model.env.length
    ? sectionHtml('Environment variables', model.env[0].line, 'environment', model.env.map((env) => `<span class="ntl-pill">${lineButton(env.key, env.line, 'environment')}=${maskedEnv(env.key, env.value)}</span>`).join(''))
    : '';

  const devEntries = Object.values(model.dev);
  const devHtml = devEntries.length
    ? sectionHtml('Netlify Dev', devEntries[0].line, 'dev', `<div class="ntl-grid">${devEntries.map((entry) => `<span class="ntl-key">${lineButton(entry.key, entry.line, 'dev')}</span><span class="ntl-val">${lineButton(entry.value, entry.line, 'dev')}</span>`).join('')}</div>`)
    : '';

  const host = document.createElement('div');
  host.className = 'netlifytoml-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="ntl-doc">
<span class="badge-netlify">${lineButton('Netlify', 1, 'source')}</span>
<div class="ntl-grid">${buildGrid(model)}</div>
${redirectsHtml}
${headersHtml}
${contextsHtml}
${envHtml}
${devHtml}
</div>`;

  const review = issueList(collectIssues(model), { title: 'Netlify Review' });
  if (review) host.appendChild(review);
  host.appendChild(sourcePreview(redactSource(text), {
    title: 'Redacted source',
    collapsed: true,
    idPrefix: 'netlify-line',
    highlighter: highlightTomlLine,
  }));
  wireSourceLinks(host, { idPrefix: 'netlify-line' });
  return { parentNode: host };
}
