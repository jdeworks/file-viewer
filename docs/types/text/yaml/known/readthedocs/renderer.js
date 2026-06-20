import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rtd-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-rtd{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2ECC40;color:#fff;vertical-align:middle;margin-right:8px;}
.rtd-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.rtd-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.rtd-sec{margin:12px 0;}
.rtd-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.rtd-kv{display:grid;grid-template-columns:auto 1fr;gap:4px 14px;font-size:12px;margin:4px 0;}
.rtd-kv dt{font-weight:600;white-space:nowrap;color:var(--fg,#24292f);}
.rtd-kv dd{margin:0;color:var(--fg-2,#555);font-family:ui-monospace,monospace;}
.rtd-pills{display:flex;flex-wrap:wrap;gap:6px;}
.rtd-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.rtd-pill-fmt{background:#ecfdf5;border-color:#6ee7b7;color:#065f46;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || \'\') || [])[0] || {};
  } catch { cfg = {}; }

  const version = cfg.version;
  const build = cfg.build || {};
  const buildOs = build.os || '';
  const buildTools = build.tools || {};
  const pythonVersion = buildTools.python || '';
  const nodeVersion = buildTools.nodejs || '';

  const pythonSection = cfg.python || {};
  const pythonInstall = Array.isArray(pythonSection.install) ? pythonSection.install : [];
  const requirements = pythonInstall.flatMap((item) => {
    if (item && typeof item === 'object') {
      if (item.requirements) return [item.requirements];
      if (item.method === 'pip' && item.path) return [item.path];
    }
    return [];
  });

  const sphinx = cfg.sphinx || null;
  const mkdocs = cfg.mkdocs || null;
  const docToolConfig = sphinx
    ? (sphinx.configuration || sphinx.fail_on_warning ? sphinx.configuration || '(configured)' : null)
    : mkdocs
      ? (mkdocs.configuration || '(configured)')
      : null;
  const docToolName = sphinx ? 'Sphinx' : mkdocs ? 'MkDocs' : null;

  const formats = Array.isArray(cfg.formats) ? cfg.formats : [];

  const search = cfg.search || null;
  const searchRanking = search && typeof search === 'object' && search.ranking ? search.ranking : null;

  const subParts = [];
  if (version) subParts.push(`v${version}`);
  if (buildOs) subParts.push(buildOs);
  if (docToolName) subParts.push(docToolName);
  if (formats.length) subParts.push(`${formats.length} format${formats.length !== 1 ? 's' : ''}`);

  const buildHtml = (buildOs || pythonVersion || nodeVersion)
    ? `<div class="rtd-sec"><h3>Build Environment</h3><dl class="rtd-kv">
      ${buildOs ? `<dt>OS</dt><dd>${esc(buildOs)}</dd>` : ''}
      ${pythonVersion ? `<dt>Python</dt><dd>${esc(pythonVersion)}</dd>` : ''}
      ${nodeVersion ? `<dt>Node.js</dt><dd>${esc(nodeVersion)}</dd>` : ''}
    </dl></div>`
    : '';

  const reqHtml = requirements.length
    ? `<div class="rtd-sec"><h3>Python Dependencies</h3><div class="rtd-pills">${requirements.map((r) => `<span class="rtd-pill">${esc(r)}</span>`).join('')}</div></div>`
    : '';

  const docToolHtml = (docToolName || docToolConfig)
    ? `<div class="rtd-sec"><h3>Documentation Tool</h3><dl class="rtd-kv">
      ${docToolName ? `<dt>Tool</dt><dd>${esc(docToolName)}</dd>` : ''}
      ${docToolConfig ? `<dt>Config</dt><dd>${esc(docToolConfig)}</dd>` : ''}
    </dl></div>`
    : '';

  const formatsHtml = formats.length
    ? `<div class="rtd-sec"><h3>Output Formats</h3><div class="rtd-pills">${formats.map((f) => `<span class="rtd-pill rtd-pill-fmt">${esc(f)}</span>`).join('')}</div></div>`
    : '';

  const searchRankingEntries = searchRanking ? Object.entries(searchRanking) : [];
  const searchHtml = searchRankingEntries.length
    ? `<div class="rtd-sec"><h3>Search Ranking</h3><dl class="rtd-kv">${searchRankingEntries.slice(0, 6).map(([path, rank]) => `<dt>${esc(path)}</dt><dd>${esc(rank)}</dd>`).join('')}</dl></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'rtd-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="rtd-title"><span class="badge-rtd">ReadTheDocs</span>Build config</div>
<div class="rtd-sub">${esc(subParts.join(' · '))}</div>
${buildHtml}${reqHtml}${docToolHtml}${formatsHtml}${searchHtml}`;
  return { parentNode: host };
}
