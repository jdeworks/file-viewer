import { ensureKnownUiStyle, issueList, maskedValue, sourcePreview, wireSourceLinks } from '../../../../../core/known-ui.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.verceljson-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.verceljson-doc .badge-vercel{display:inline-block;background:#000;color:#fff;padding:2px 9px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.04em;margin-bottom:10px;}
.verceljson-doc .vcl-grid{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:8px 0 12px;}
.verceljson-doc .vcl-key{color:var(--fg-2,#888);font-size:12px;}
.verceljson-doc .vcl-val{font:12px ui-monospace,monospace;color:var(--accent,#0070f3);word-break:break-all;}
.verceljson-doc .vcl-sec{margin:14px 0;}
.verceljson-doc .vcl-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.verceljson-doc .vcl-pill{display:inline-block;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:2px 8px;font:12px ui-monospace,monospace;margin:2px;}
.verceljson-doc .vcl-table{width:100%;border-collapse:collapse;font-size:13px;}
.verceljson-doc .vcl-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.verceljson-doc .vcl-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.verceljson-doc .vcl-src{color:var(--accent,#0070f3);}
.verceljson-doc .vcl-dst{color:var(--fg-2,#888);}
.verceljson-doc .vcl-badge{display:inline-block;background:var(--bg-3,#e8e8e8);color:var(--fg-2,#888);border-radius:3px;padding:0 5px;font-size:10px;margin-left:4px;vertical-align:middle;}
.verceljson-doc .vcl-masked{color:var(--fg-2,#888);font-style:italic;}
.verceljson-doc .vcl-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;}
.verceljson-doc .vcl-link:hover{color:var(--accent,#0070f3);}
.verceljson-doc .vcl-json-key{color:#0550ae;font-weight:700;}
.verceljson-doc .vcl-json-string{color:#0a7f38;}
`;

const HELP = {
  version: 'Vercel configuration schema version.',
  framework: 'Framework preset Vercel uses for build and routing defaults.',
  buildCommand: 'Command Vercel runs to build the project.',
  installCommand: 'Command Vercel runs before build to install dependencies.',
  outputDirectory: 'Directory uploaded as static build output.',
  devCommand: 'Local development command used by Vercel tooling.',
  regions: 'Serverless function regions selected for deployment.',
  rewrites: 'Internal routing rules that serve another destination without changing the visible URL.',
  redirects: 'HTTP redirects that change the browser URL and status code.',
  headers: 'HTTP response headers applied to matching paths.',
  functions: 'Serverless function runtime limits by file pattern.',
  env: 'Environment values available at runtime or build time.',
  source: 'Open this Vercel setting in source.',
};

const KNOWN_TOP_LEVEL_KEYS = new Set([
  '$schema', 'build', 'buildCommand', 'cleanUrls', 'crons', 'devCommand', 'distDir',
  'env', 'framework', 'functions', 'github', 'headers', 'ignoreCommand',
  'images', 'installCommand', 'outputDirectory', 'public', 'redirects', 'regions',
  'rewrites', 'routes', 'trailingSlash', 'version',
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

function lineButton(label, line, key = 'source', className = '') {
  const title = `${helpFor(key)} Open line ${line || 1} in source.`;
  const cls = className ? ` vcl-link ${className}` : ' vcl-link';
  return `<button class="${cls.trim()}" type="button" data-source-line="${line || 1}" title="${esc(title)}">${esc(label)}</button>`;
}

function shortValue(value, max = 60) {
  const text = String(value == null ? '' : value);
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function maskedEnvValue(key, value) {
  const masked = maskedValue(key, value);
  const title = masked.reason ? ` title="${esc(masked.reason)}"` : '';
  return masked.masked
    ? `<span class="vcl-masked"${title}>=[configured]</span>`
    : `=<span style="color:var(--fg-2,#888);font-size:11px"${title}>${esc(shortValue(value, 30))}</span>`;
}

function routeLine(text, item, fallbackKey) {
  const source = item.source || item.src || item.pattern || '';
  return source ? valueLine(text, item.source ? 'source' : 'src', source, keyLine(text, fallbackKey)) : keyLine(text, fallbackKey);
}

function headerNames(rule) {
  return Array.isArray(rule.headers) ? rule.headers.map((h) => String(h.key || '').toLowerCase()) : [];
}

function collectIssues(cfg, text, model) {
  const issues = [];
  for (const key of Object.keys(cfg || {})) {
    if (!KNOWN_TOP_LEVEL_KEYS.has(key)) {
      issues.push({ severity: 'info', label: 'unknown key', line: keyLine(text, key), message: `"${key}" is not a common Vercel top-level key; check for a typo or unsupported schema field.` });
    }
  }
  if (!cfg.version) {
    issues.push({ severity: 'info', label: 'version', line: keyLine(text, 'version'), message: 'No Vercel schema version is declared.' });
  }
  if (!cfg.framework) {
    issues.push({ severity: 'info', label: 'framework', line: 1, message: 'No framework preset is declared; Vercel will infer behavior from the repository.' });
  }
  if (/curl\s+.*\|\s*(sh|bash)|wget\s+.*\|\s*(sh|bash)|npm\s+install\s+-g/i.test(`${cfg.installCommand || ''}\n${cfg.buildCommand || ''}`)) {
    issues.push({ severity: 'warning', label: 'command', line: valueLine(text, cfg.installCommand ? 'installCommand' : 'buildCommand', cfg.installCommand || cfg.buildCommand), message: 'Build/install command runs downloaded or global code; review supply-chain risk.' });
  }
  for (const rewrite of model.rewrites) {
    const source = rewrite.source || rewrite.src || '';
    const dest = rewrite.destination || rewrite.dest || '';
    if (/^\/*\(\.\*\)|\/\(.*\)/.test(source) || source === '/(.*)') {
      issues.push({ severity: 'warning', label: 'rewrite', line: routeLine(text, rewrite, 'rewrites'), message: `${source} is a broad catch-all rewrite; verify it does not shadow static assets or explicit routes.` });
    }
    if (/^https?:\/\//i.test(dest)) {
      issues.push({ severity: 'info', label: 'proxy', line: routeLine(text, rewrite, 'rewrites'), message: `${source} proxies to an external origin.` });
    }
  }
  for (const redirect of model.redirects) {
    const status = redirect.statusCode || (redirect.permanent ? 308 : 307);
    if (/^https?:\/\//i.test(redirect.destination || redirect.dest || '')) {
      issues.push({ severity: 'info', label: 'external redirect', line: routeLine(text, redirect, 'redirects'), message: `${redirect.source || redirect.src || '?'} redirects outside this deployment with status ${status}.` });
    }
  }

  const allHeaderNames = new Set(model.headers.flatMap(headerNames));
  const broadHeaderRule = model.headers.find((rule) => /\/\(\.\*\)|\/\*/.test(rule.source || ''));
  if (!allHeaderNames.has('content-security-policy')) {
    issues.push({ severity: 'warning', label: 'headers', line: keyLine(text, 'headers'), message: 'No Content-Security-Policy header is configured.' });
  }
  if (!allHeaderNames.has('strict-transport-security')) {
    issues.push({ severity: 'warning', label: 'headers', line: keyLine(text, 'headers'), message: 'No Strict-Transport-Security header is configured.' });
  }
  if (!broadHeaderRule && model.headers.length) {
    issues.push({ severity: 'info', label: 'headers', line: keyLine(text, 'headers'), message: 'Security headers do not appear to target all paths.' });
  }

  for (const [pattern, opts] of model.functions) {
    if ((opts?.maxDuration || 0) >= 60) {
      issues.push({ severity: 'info', label: 'function limit', line: valueLine(text, pattern, '', keyLine(text, 'functions')), message: `${pattern} allows ${opts.maxDuration}s execution; confirm it matches plan limits and user-facing latency.` });
    }
    if ((opts?.memory || 0) >= 3008) {
      issues.push({ severity: 'info', label: 'function memory', line: valueLine(text, pattern, '', keyLine(text, 'functions')), message: `${pattern} uses high function memory (${opts.memory} MB).` });
    }
  }

  for (const [key, value] of model.envEntries) {
    const masked = maskedValue(key, value);
    const line = valueLine(text, key, value, keyLine(text, 'env'));
    if (/^(NEXT_PUBLIC_|PUBLIC_|VITE_|NUXT_PUBLIC_)/.test(key) && masked.masked) {
      issues.push({ severity: 'warning', label: 'public secret', line, message: `${key} looks sensitive but is exposed to client bundles by its prefix.` });
    } else if (masked.masked) {
      issues.push({ severity: 'warning', label: 'secret', line, message: `${key} looks sensitive; keep the actual value in Vercel project secrets.` });
    } else if (/^(NEXT_PUBLIC_|PUBLIC_|VITE_|NUXT_PUBLIC_)/.test(key)) {
      issues.push({ severity: 'info', label: 'public env', line, message: `${key} is intentionally exposed to browser code.` });
    }
  }
  return issues;
}

function redactSource(text) {
  return String(text || '').split(/\r?\n/).map((line) => {
    const m = line.match(/^(\s*)"([^"]+)"(\s*:\s*)"([^"]*)"(.*)$/);
    if (!m) return line;
    const masked = maskedValue(m[2], m[4]);
    return masked.masked ? `${m[1]}"${m[2]}"${m[3]}"********"${m[5]}` : line;
  }).join('\n');
}

function highlightJsonLine(line) {
  const raw = esc(line);
  return raw
    .replace(/^(\s*)"([^"]+)"(\s*:)/, `$1<span class="vcl-json-key">"$2"</span>$3`)
    .replace(/(:\s*)"([^"]*)"/, `$1<span class="vcl-json-string">"$2"</span>`);
}

function kv(text, key, val, sourceKey = key) {
  if (val == null || val === '') return '';
  const line = valueLine(text, sourceKey, val, keyLine(text, sourceKey));
  return `<span class="vcl-key">${lineButton(key, line, sourceKey)}</span><span class="vcl-val">${lineButton(val, line, sourceKey)}</span>`;
}

export function render(intake) {
  const text = intake.text || '';
  const cfg = intake.parsed ?? (() => { try { return JSON.parse(text || '{}'); } catch { return {}; } })();

  ensureKnownUiStyle(document);
  const framework = cfg.framework || null;
  const version = cfg.version || null;
  const buildCmd = cfg.buildCommand || null;
  const installCmd = cfg.installCommand || null;
  const outputDir = cfg.outputDirectory || cfg.distDir || null;
  const devCmd = cfg.devCommand || null;

  const rewrites = Array.isArray(cfg.rewrites) ? cfg.rewrites : [];
  const redirects = Array.isArray(cfg.redirects) ? cfg.redirects : [];
  const headers = Array.isArray(cfg.headers) ? cfg.headers : [];
  const regions = Array.isArray(cfg.regions) ? cfg.regions : (cfg.regions ? [cfg.regions] : []);
  const routes = Array.isArray(cfg.routes) ? cfg.routes : [];
  const allEnv = { ...(cfg.env || {}), ...(cfg.build?.env || {}) };
  const envEntries = Object.entries(allEnv);
  const functions = cfg.functions && typeof cfg.functions === 'object' ? Object.entries(cfg.functions) : [];
  const model = { rewrites, redirects, headers, regions, routes, envEntries, functions };

  const host = document.createElement('div');
  host.className = 'verceljson-doc';

  const gridLines = [
    version != null ? kv(text, 'Schema version', version, 'version') : '',
    framework ? kv(text, 'Framework', framework, 'framework') : '',
    buildCmd ? kv(text, 'Build command', buildCmd, 'buildCommand') : '',
    installCmd ? kv(text, 'Install command', installCmd, 'installCommand') : '',
    outputDir ? kv(text, 'Output directory', outputDir, cfg.outputDirectory ? 'outputDirectory' : 'distDir') : '',
    devCmd ? kv(text, 'Dev command', devCmd, 'devCommand') : '',
    regions.length ? `<span class="vcl-key">${lineButton('Regions', keyLine(text, 'regions'), 'regions')}</span><span class="vcl-val">${regions.map((r) => lineButton(r, lineContaining(text, `"${escapeRegExp(r)}"`, keyLine(text, 'regions')), 'regions')).join(', ')}</span>` : '',
  ].filter(Boolean);

  const rewritesHtml = rewrites.length
    ? `<div class="vcl-sec"><h3>${lineButton(`Rewrites (${rewrites.length})`, keyLine(text, 'rewrites'), 'rewrites')}</h3><table class="vcl-table"><thead><tr><th>Source</th><th>Destination</th></tr></thead><tbody>${rewrites.slice(0, 12).map((r) => {
        const line = routeLine(text, r, 'rewrites');
        return `<tr><td class="vcl-src">${lineButton(r.source || r.src || '?', line, 'rewrites')}</td><td class="vcl-dst">${lineButton(r.destination || r.dest || '?', valueLine(text, r.destination ? 'destination' : 'dest', r.destination || r.dest, line), 'rewrites')}</td></tr>`;
      }).join('')}${rewrites.length > 12 ? `<tr><td colspan="2" style="color:var(--fg-2,#888);font-size:11px">+${rewrites.length - 12} more</td></tr>` : ''}</tbody></table></div>`
    : '';

  const redirectsHtml = redirects.length
    ? `<div class="vcl-sec"><h3>${lineButton(`Redirects (${redirects.length})`, keyLine(text, 'redirects'), 'redirects')}</h3><table class="vcl-table"><thead><tr><th>Source</th><th>Destination</th><th>Status</th></tr></thead><tbody>${redirects.slice(0, 12).map((r) => {
        const status = r.statusCode || (r.permanent ? '308' : '307');
        const line = routeLine(text, r, 'redirects');
        return `<tr><td class="vcl-src">${lineButton(r.source || r.src || '?', line, 'redirects')}</td><td class="vcl-dst">${lineButton(r.destination || r.dest || '?', valueLine(text, r.destination ? 'destination' : 'dest', r.destination || r.dest, line), 'redirects')}</td><td>${lineButton(status, valueLine(text, r.statusCode ? 'statusCode' : 'permanent', r.statusCode || r.permanent, line), 'redirects')}</td></tr>`;
      }).join('')}${redirects.length > 12 ? `<tr><td colspan="3" style="color:var(--fg-2,#888);font-size:11px">+${redirects.length - 12} more</td></tr>` : ''}</tbody></table></div>`
    : '';

  const routesHtml = routes.length && !rewrites.length && !redirects.length
    ? `<div class="vcl-sec"><h3>${lineButton(`Routes (${routes.length})`, keyLine(text, 'routes'), 'rewrites')}</h3><table class="vcl-table"><thead><tr><th>Source</th><th>Destination</th></tr></thead><tbody>${routes.slice(0, 12).map((r) => `<tr><td class="vcl-src">${lineButton(r.src || '?', routeLine(text, r, 'routes'), 'rewrites')}</td><td class="vcl-dst">${lineButton(r.dest || '?', valueLine(text, 'dest', r.dest, routeLine(text, r, 'routes')), 'rewrites')}</td></tr>`).join('')}${routes.length > 12 ? `<tr><td colspan="2" style="color:var(--fg-2,#888);font-size:11px">+${routes.length - 12} more</td></tr>` : ''}</tbody></table></div>`
    : '';

  const headersHtml = headers.length
    ? `<div class="vcl-sec"><h3>${lineButton(`Headers (${headers.length} rule${headers.length !== 1 ? 's' : ''})`, keyLine(text, 'headers'), 'headers')}</h3>${headers.slice(0, 6).map((h) => {
        const line = routeLine(text, h, 'headers');
        const hdrs = Array.isArray(h.headers) ? h.headers.map((hh) => `<span class="vcl-pill">${lineButton(hh.key, valueLine(text, 'key', hh.key, line), 'headers')}</span>`).join('') : '';
        return `<div style="margin:4px 0;font-size:12px"><span class="vcl-src" style="font-family:ui-monospace,monospace">${lineButton(h.source || '?', line, 'headers')}</span> ${hdrs}</div>`;
      }).join('')}${headers.length > 6 ? `<div style="color:var(--fg-2,#888);font-size:11px">+${headers.length - 6} more</div>` : ''}</div>`
    : '';

  const functionsHtml = functions.length
    ? `<div class="vcl-sec"><h3>${lineButton(`Functions (${functions.length})`, keyLine(text, 'functions'), 'functions')}</h3><table class="vcl-table"><thead><tr><th>Pattern</th><th>Max duration</th><th>Memory</th></tr></thead><tbody>${functions.map(([pattern, opts]) => {
        const line = keyLine(text, pattern, keyLine(text, 'functions'));
        const dur = opts.maxDuration != null ? `${opts.maxDuration}s` : '-';
        const mem = opts.memory != null ? `${opts.memory} MB` : '-';
        return `<tr><td>${lineButton(pattern, line, 'functions')}</td><td>${lineButton(dur, keyLine(text, 'maxDuration', line), 'functions')}</td><td>${lineButton(mem, keyLine(text, 'memory', line), 'functions')}</td></tr>`;
      }).join('')}</tbody></table></div>`
    : '';

  const envHtml = envEntries.length
    ? `<div class="vcl-sec"><h3>${lineButton(`Environment variables (${envEntries.length})`, keyLine(text, 'env'), 'env')}</h3><div style="display:flex;flex-wrap:wrap;gap:6px;margin:4px 0">${envEntries.map(([k, v]) => {
        const line = valueLine(text, k, v, keyLine(text, 'env'));
        return `<span class="vcl-pill">${lineButton(k, line, 'env')}${maskedEnvValue(k, v)}</span>`;
      }).join('')}</div></div>`
    : '';

  host.innerHTML = `<style>${CSS}</style>
<span class="badge-vercel">${lineButton('Vercel', 1, 'source')}</span>
<div class="vcl-grid">${gridLines.join('')}</div>
${rewritesHtml}
${redirectsHtml}
${routesHtml}
${headersHtml}
${functionsHtml}
${envHtml}`;

  const review = issueList(collectIssues(cfg, text, model), { title: 'Vercel Review' });
  if (review) host.insertBefore(review, host.querySelector('.vcl-sec') || null);
  host.appendChild(sourcePreview(redactSource(text), {
    title: 'Redacted source',
    collapsed: true,
    idPrefix: 'vercel-line',
    highlighter: highlightJsonLine,
  }));
  wireSourceLinks(host, { idPrefix: 'vercel-line' });
  return { parentNode: host };
}
