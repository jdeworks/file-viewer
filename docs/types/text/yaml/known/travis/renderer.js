import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
import { ensureKnownUiStyle, issueList, maskedValue, sourcePreview, wireSourceLinks } from '../../../../../core/known-ui.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SECRETISH = /password|passwd|pwd|secret|token|api[_-]?key|private[_-]?key|client[_-]?secret|credential|auth|access[_-]?key/i;

const CSS = `
.trv-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-trv{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3eaaaf;color:#fff;vertical-align:middle;margin-right:8px;}
.trv-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.trv-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.trv-sec{margin:12px 0;}
.trv-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.trv-pills{display:flex;flex-wrap:wrap;gap:6px;}
.trv-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.trv-pill.lang{background:#e8f5e9;border-color:#a5d6a7;color:#1b5e20;}
.trv-pill.branch{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8;}
.trv-pill.warn{background:#fff7ed;border-color:#fed7aa;color:#c2410c;}
.trv-cmd{font:12px/1.5 ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:6px 10px;margin:4px 0;white-space:pre-wrap;word-break:break-all;}
.trv-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;}
.trv-link:hover{color:var(--accent,#2563eb);}
.trv-mask-reason{font-size:11px;color:var(--fg-2,#888);font-family:system-ui,sans-serif;margin-left:4px;}
.trv-source-key{color:#3eaaaf;font-weight:700;}
.trv-source-comment{color:#6e7781;font-style:italic;}
`;

const HELP = {
  language: 'Main runtime selected by Travis CI.',
  versions: 'Runtime version matrix. Exact patch versions are more reproducible than major-only values.',
  services: 'Background services available during the build.',
  stages: 'Travis build stages and stage-level conditions.',
  branches: 'Branch allowlist or blocklist controlling when Travis runs.',
  env: 'Environment variables available during the build. Secret-looking values are redacted.',
  script: 'Commands executed for the main build step.',
  after_success: 'Commands executed after a successful build.',
};

function normArr(v) {
  if (!v) return [];
  return Array.isArray(v) ? v.map(String) : [String(v)];
}

function helpFor(key) {
  return HELP[key] || 'Open this Travis CI item in source.';
}

function lineButton(label, line, key = label, className = 'trv-link') {
  const title = `${helpFor(key)} Open line ${line || 1} in source.`;
  return `<button class="${className}" type="button" data-source-line="${line || 1}" title="${esc(title)}">${esc(label)}</button>`;
}

function buildLineMap(text) {
  const entries = new Map();
  const stack = [];
  for (const [idx, rawLine] of String(text || '').split(/\r?\n/).entries()) {
    if (!rawLine.trim() || /^\s*#/.test(rawLine)) continue;
    const m = rawLine.match(/^(\s*)([A-Za-z_.$][\w:.$-]*)\s*:\s*(.*)$/);
    if (!m) continue;
    const indent = m[1].replace(/\t/g, '  ').length;
    const key = m[2];
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const path = [...stack.map((item) => item.key), key].join('.');
    entries.set(path, { line: idx + 1, raw: m[3] });
    if (m[3].trim() === '') stack.push({ indent, key });
  }
  return entries;
}

function lineFor(map, ...paths) {
  for (const path of paths) {
    const hit = map.get(path);
    if (hit) return hit.line;
  }
  return 1;
}

function versionIsBroad(version) {
  return /^\d+$/.test(String(version || '').replace(/^["']|["']$/g, ''));
}

function scriptHasDownloadPipe(script) {
  return normArr(script).some((cmd) => /(curl|wget)\b[^|;&]*(\||\bbash\b|\bsh\b)/i.test(String(cmd)));
}

function envEntries(cfg, lineMap) {
  const env = cfg.env || {};
  const out = [];
  const add = (value, line) => {
    const text = String(value);
    const m = text.match(/^([A-Za-z_][\w]*)=(.*)$/);
    if (m) out.push({ key: m[1], value: m[2], line });
    else out.push({ key: text, value: '', line });
  };
  if (Array.isArray(env)) {
    env.forEach((value) => add(value, lineFor(lineMap, 'env')));
  } else if (env && typeof env === 'object') {
    for (const [group, values] of Object.entries(env)) {
      for (const value of normArr(values)) add(value, lineFor(lineMap, `env.${group}`, 'env'));
    }
  }
  return out;
}

function renderEnvPill(entry) {
  const masked = maskedValue(entry.key, entry.value);
  if (masked.masked || SECRETISH.test(entry.key)) {
    const reason = masked.reason || `masked because "${entry.key}" looks sensitive`;
    return `<span class="trv-pill warn" title="${esc(reason)}">${lineButton(entry.key, entry.line, 'env')}=[configured]</span><span class="trv-mask-reason">${esc(reason)}</span>`;
  }
  return `<span class="trv-pill">${lineButton(entry.key, entry.line, 'env')}</span>`;
}

function collectIssues(model) {
  const issues = [];
  for (const version of model.versions) {
    if (versionIsBroad(version)) {
      issues.push({
        severity: 'info',
        label: 'runtime version',
        line: model.versionLine,
        message: `${model.lang} version ${version} is major-only; pin a patch version if builds need exact reproducibility.`,
      });
    }
  }
  for (const env of model.env) {
    if (SECRETISH.test(env.key) || maskedValue(env.key, env.value).masked) {
      issues.push({
        severity: 'warning',
        label: 'secret env',
        line: env.line,
        message: `${env.key} looks sensitive; store secrets in Travis encrypted variables instead of source.`,
      });
    }
  }
  if (scriptHasDownloadPipe(model.scripts) || scriptHasDownloadPipe(model.afterSuccess)) {
    issues.push({
      severity: 'warning',
      label: 'download pipe',
      line: model.scriptLine,
      message: 'A build command pipes downloaded content into a shell.',
    });
  }
  if (model.deployish && !model.branches.length) {
    issues.push({
      severity: 'warning',
      label: 'branch guard',
      line: model.scriptLine,
      message: 'Deploy-like commands appear without branch allowlist filters.',
    });
  } else if (model.branches.length) {
    issues.push({
      severity: 'info',
      label: 'branch guard',
      line: model.branchLine,
      message: `Branch allowlist is configured for ${model.branches.join(', ')}.`,
    });
  }
  return issues;
}

function redactSource(text) {
  return String(text || '').split(/\r?\n/).map((line) => {
    const envAssign = line.match(/^(\s*-\s*)([A-Za-z_][\w]*)=(.*)$/);
    if (envAssign && (SECRETISH.test(envAssign[2]) || maskedValue(envAssign[2], envAssign[3]).masked)) {
      return `${envAssign[1]}${envAssign[2]}=[configured]`;
    }
    const keyVal = line.match(/^(\s*)([A-Za-z_.$][\w:.$-]*)\s*:\s*(.*)$/);
    if (keyVal && SECRETISH.test(keyVal[2])) return `${keyVal[1]}${keyVal[2]}: [configured]`;
    return line;
  }).join('\n');
}

function highlightYamlLine(line) {
  const escaped = esc(line);
  if (/^\s*#/.test(line)) return `<span class="trv-source-comment">${escaped}</span>`;
  return escaped.replace(/^(\s*[A-Za-z_.$][\w:.$-]*)(\s*:)/, '<span class="trv-source-key">$1</span>$2');
}

export async function render(intake) {
  const text = intake.text || '';
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(text) || [])[0] || {};
  } catch { cfg = {}; }
  const lineMap = buildLineMap(text);

  const lang = cfg.language || 'unknown';
  const versions = normArr(cfg[lang] || cfg.node_js || cfg.python || cfg.ruby || cfg.go);
  const os = normArr(cfg.os);
  const services = normArr(cfg.services);
  const scripts = normArr(cfg.script);
  const afterSuccess = normArr(cfg.after_success);
  const stages = Array.isArray(cfg.stages) ? cfg.stages : [];
  const branchesInclude = normArr(cfg.branches?.only || cfg.branches?.include || []);
  const env = envEntries(cfg, lineMap);
  const model = {
    lang,
    versions,
    versionLine: lineFor(lineMap, lang, 'node_js', 'python', 'ruby', 'go'),
    scripts,
    afterSuccess,
    scriptLine: lineFor(lineMap, 'script', 'after_success'),
    env,
    branches: branchesInclude,
    branchLine: lineFor(lineMap, 'branches.only', 'branches.include', 'branches'),
    deployish: [...scripts, ...afterSuccess].some((cmd) => /deploy|publish|release|s3|cloudfront/i.test(cmd)),
  };

  const langHtml = `<div class="trv-sec"><h3>Language</h3><div class="trv-pills">
    <span class="trv-pill lang">${lineButton(lang, lineFor(lineMap, 'language'), 'language')}</span>
    ${versions.slice(0, 6).map((v) => `<span class="trv-pill">${lineButton(v, model.versionLine, 'versions')}</span>`).join('')}
    ${os.map((o) => `<span class="trv-pill">${esc(o)}</span>`).join('')}
  </div></div>`;

  const servicesHtml = services.length
    ? `<div class="trv-sec"><h3>${lineButton('Services', lineFor(lineMap, 'services'), 'services')}</h3><div class="trv-pills">${services.map((s) => `<span class="trv-pill">${esc(s)}</span>`).join('')}</div></div>`
    : '';

  const stagesHtml = stages.length
    ? `<div class="trv-sec"><h3>${lineButton(`Stages (${stages.length})`, lineFor(lineMap, 'stages'), 'stages')}</h3><div class="trv-pills">${stages.map((s) => `<span class="trv-pill">${esc(typeof s === 'object' ? Object.keys(s)[0] : s)}</span>`).join('')}</div></div>`
    : '';

  const scriptHtml = scripts.length
    ? `<div class="trv-sec"><h3>${lineButton('Script', lineFor(lineMap, 'script'), 'script')}</h3>${scripts.slice(0, 5).map((s) => `<div class="trv-cmd">${esc(s)}</div>`).join('')}${scripts.length > 5 ? `<div style="font-size:12px;color:var(--fg-2,#888)">…and ${scripts.length - 5} more</div>` : ''}</div>`
    : '';

  const branchHtml = branchesInclude.length
    ? `<div class="trv-sec"><h3>${lineButton('Branches', model.branchLine, 'branches')}</h3><div class="trv-pills">${branchesInclude.map((b) => `<span class="trv-pill branch">${esc(b)}</span>`).join('')}</div></div>`
    : '';

  const envHtml = env.length
    ? `<div class="trv-sec"><h3>${lineButton(`Environment (${env.length})`, lineFor(lineMap, 'env'), 'env')}</h3><div class="trv-pills">${env.map(renderEnvPill).join('')}</div></div>`
    : '';

  const sub = [lang !== 'unknown' ? lang : '', versions.length ? `${versions.length} version${versions.length !== 1 ? 's' : ''}` : '', services.length ? `${services.length} service${services.length !== 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  ensureKnownUiStyle(document);
  host.className = 'trv-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="trv-title"><span class="badge-trv">Travis CI</span>Build config</div>
<div class="trv-sub">${esc(sub)}</div>
${langHtml}${stagesHtml}${servicesHtml}${envHtml}${scriptHtml}${branchHtml}`;
  const review = issueList(collectIssues(model), { title: 'Travis CI Review' });
  if (review) host.insertBefore(review, host.querySelector('.trv-sec'));
  host.appendChild(sourcePreview(redactSource(text), { title: 'Redacted source', collapsed: true, idPrefix: 'trv-line', highlighter: highlightYamlLine }));
  wireSourceLinks(host, { idPrefix: 'trv-line' });
  return { parentNode: host };
}
