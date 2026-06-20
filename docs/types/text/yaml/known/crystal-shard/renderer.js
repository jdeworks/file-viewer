import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function scalar(obj, key) {
  if (obj == null) return null;
  const v = obj[key];
  if (v == null) return null;
  return String(v);
}

function parseDepsYaml(obj) {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj).map(([name, props]) => {
    const p = props && typeof props === 'object' ? props : {};
    return { name, ...p };
  });
}

function parseTargetsYaml(obj) {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj).map(([name, props]) => {
    const p = props && typeof props === 'object' ? props : {};
    return { name, main: p.main || '' };
  });
}

function depSource(dep) {
  if (dep.github) return { label: 'GitHub', url: 'https://github.com/' + dep.github, display: dep.github };
  if (dep.gitlab) return { label: 'GitLab', url: 'https://gitlab.com/' + dep.gitlab, display: dep.gitlab };
  if (dep.git) return { label: 'git', url: dep.git, display: String(dep.git).replace(/^https?:\/\//, '') };
  if (dep.path) return { label: 'path', url: null, display: dep.path };
  return null;
}

const CSS = `
.crystalshard-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.crystalshard-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#111111;color:#fff;vertical-align:middle;margin-right:8px;}
.crystalshard-title{font-size:20px;font-weight:700;margin:0 0 2px;}
.crystalshard-subtitle{font-size:13px;color:var(--fg-2,#888);margin:2px 0 4px;}
.crystalshard-desc{color:var(--fg,#24292f);margin:4px 0 14px;}
.crystalshard-sec{margin:14px 0;}
.crystalshard-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.crystalshard-meta{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 12px;}
.crystalshard-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e5e7eb);}
.crystalshard-authors{list-style:none;margin:0;padding:0;}
.crystalshard-authors li{font-size:12px;color:var(--fg-2,#888);padding:1px 0;}
.crystalshard-deps{list-style:none;margin:0;padding:0;}
.crystalshard-deps li{display:flex;align-items:baseline;gap:12px;padding:5px 0;border-bottom:1px solid var(--border,#e5e7eb);}
.crystalshard-dep-name{font:13px ui-monospace,monospace;color:var(--accent,#0969da);min-width:140px;flex-shrink:0;}
.crystalshard-dep-src{font-size:12px;color:var(--fg-2,#888);flex:1;}
.crystalshard-dep-ver{font:11px ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e5e7eb);border-radius:4px;padding:1px 6px;white-space:nowrap;}
.crystalshard-targets{list-style:none;margin:0;padding:0;}
.crystalshard-targets li{display:flex;gap:12px;padding:4px 0;border-bottom:1px solid var(--border,#e5e7eb);}
.crystalshard-target-name{font:13px ui-monospace,monospace;font-weight:600;min-width:140px;flex-shrink:0;}
.crystalshard-target-main{font:12px ui-monospace,monospace;color:var(--fg-2,#888);}
`;

export async function render(intake) {
  const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  let cfg = {};
  try {
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch {
    cfg = {};
  }

  const name = scalar(cfg, 'name') || '(unnamed)';
  const version = scalar(cfg, 'version') || '';
  const description = scalar(cfg, 'description') || '';
  const license = scalar(cfg, 'license') || '';
  const crystal = scalar(cfg, 'crystal') || '';
  const authors = Array.isArray(cfg.authors) ? cfg.authors : [];

  const deps = parseDepsYaml(cfg.dependencies);
  const devDeps = parseDepsYaml(cfg.development_dependencies);
  const targets = parseTargetsYaml(cfg.targets);

  function renderDeps(list) {
    if (!list.length) return '';
    return list.map((d) => {
      const src = depSource(d);
      const srcHtml = src
        ? (src.url
          ? `<a class="crystalshard-dep-src" href="${esc(src.url)}" target="_blank" rel="noopener noreferrer">${esc(src.label)}: ${esc(src.display)} &#8599;</a>`
          : `<span class="crystalshard-dep-src">${esc(src.label)}: ${esc(src.display)}</span>`)
        : '';
      const ver = d.version || d.tag || d.branch || '';
      return `<li>
        <span class="crystalshard-dep-name">${esc(d.name)}</span>
        ${srcHtml}
        ${ver ? `<span class="crystalshard-dep-ver">${esc(ver)}</span>` : ''}
      </li>`;
    }).join('');
  }

  const chips = [
    version && `v${version}`,
    crystal && `crystal ${crystal}`,
    license,
  ].filter(Boolean).map((m) => `<span class="crystalshard-chip">${esc(m)}</span>`).join('');

  let html = `<style>${CSS}</style>
<div class="crystalshard-doc">
  <span class="crystalshard-badge">Crystal</span>
  <div class="crystalshard-title">${esc(name)}</div>
  ${chips ? `<div class="crystalshard-meta">${chips}</div>` : ''}
  ${description ? `<div class="crystalshard-desc">${esc(description)}</div>` : ''}`;

  if (authors.length) {
    html += `<div class="crystalshard-sec"><h3>Authors</h3><ul class="crystalshard-authors">${authors.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>`;
  }

  if (deps.length) {
    html += `<div class="crystalshard-sec"><h3>Dependencies (${deps.length})</h3><ul class="crystalshard-deps">${renderDeps(deps)}</ul></div>`;
  }

  if (devDeps.length) {
    html += `<div class="crystalshard-sec"><h3>Dev Dependencies (${devDeps.length})</h3><ul class="crystalshard-deps">${renderDeps(devDeps)}</ul></div>`;
  }

  if (targets.length) {
    html += `<div class="crystalshard-sec"><h3>Targets (${targets.length})</h3><ul class="crystalshard-targets">${targets.map((t) => `<li><span class="crystalshard-target-name">${esc(t.name)}</span><span class="crystalshard-target-main">${esc(t.main)}</span></li>`).join('')}</ul></div>`;
  }

  html += '</div>';

  const host = document.createElement('div');
  host.innerHTML = html;
  return { parentNode: host };
}
