import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.grype-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.grype-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#8B0000;color:#fff;vertical-align:middle;margin-right:8px;}
.grype-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.grype-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.grype-sec{margin:12px 0;}
.grype-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.grype-pill{display:inline-flex;align-items:center;font-size:11px;padding:2px 9px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
.grype-pill.crit{background:#fef2f2;border-color:#fca5a5;color:#991b1b;}
.grype-pill.high{background:#fff7ed;border-color:#fdba74;color:#c2410c;}
.grype-pill.med{background:#fefce8;border-color:#fde047;color:#854d0e;}
.grype-pill.low{background:#f0fdf4;border-color:#86efac;color:#166534;}
.grype-pill.scope{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8;}
.grype-pill.flag{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg,#24292f);}
.grype-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.grype-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.grype-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
.grype-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:0 0 8px;}
.grype-table{width:100%;border-collapse:collapse;font-size:12px;}
.grype-table th{text-align:left;font-weight:600;padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0);color:var(--fg-2,#888);}
.grype-table td{padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.grype-table tr:last-child td{border-bottom:none;}
.grype-masked{font-style:italic;color:var(--fg-2,#888);}
`;

const SEV_CLASS = { critical: 'crit', high: 'high', medium: 'med', low: 'low' };

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  // Severity threshold
  const failOnSev = cfg['fail-on-severity'] || null;
  const sevClass = failOnSev ? (SEV_CLASS[failOnSev.toLowerCase()] || '') : '';
  const sevHtml = failOnSev
    ? `<div class="grype-sec"><h3>Severity threshold</h3>
        <span class="grype-pill ${sevClass}">${esc(failOnSev)}</span>
      </div>`
    : '';

  // Search scope
  const search = cfg.search || {};
  const scope = search.scope || null;
  const unindexed = search['unindexed-archives'] ?? null;
  const indexed = search['indexed-archives'] ?? null;
  const scopeHtml = (scope || unindexed !== null || indexed !== null)
    ? `<div class="grype-sec"><h3>Search scope</h3>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">
          ${scope ? `<span class="grype-pill scope">${esc(scope)}</span>` : ''}
          ${unindexed !== null ? `<span class="grype-pill flag">unindexed-archives: ${esc(String(unindexed))}</span>` : ''}
          ${indexed !== null ? `<span class="grype-pill flag">indexed-archives: ${esc(String(indexed))}</span>` : ''}
        </div>
      </div>`
    : '';

  // Ignore rules
  const ignoreList = Array.isArray(cfg.ignore) ? cfg.ignore : [];
  let ignoreHtml = '';
  if (ignoreList.length) {
    const rows = ignoreList.slice(0, 50).map((entry) => {
      const vuln = typeof entry === 'string' ? entry : (entry.vulnerability || entry['vuln-id'] || '');
      const pkg = typeof entry === 'object' ? (entry.package || entry.name || '') : '';
      const fixState = typeof entry === 'object' ? (entry['fix-state'] || entry['fix-states'] || '') : '';
      return `<tr>
        <td>${esc(vuln)}</td>
        <td>${esc(pkg)}</td>
        <td>${esc(Array.isArray(fixState) ? fixState.join(', ') : String(fixState || ''))}</td>
      </tr>`;
    }).join('');
    ignoreHtml = `<div class="grype-sec"><h3>Ignore rules (${ignoreList.length})</h3>
      <div class="grype-card" style="padding:0;overflow:hidden;">
        <table class="grype-table">
          <thead><tr><th>Vulnerability</th><th>Package</th><th>Fix state</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${ignoreList.length > 50 ? `<div style="font-size:12px;color:var(--fg-2,#888);margin-top:4px;">…and ${ignoreList.length - 50} more</div>` : ''}
    </div>`;
  }

  // ignore-states / ignore-fixstates
  const ignoreStates = cfg['ignore-states'] || cfg['ignore-fixstates'] || [];
  const ignoreStatesArr = Array.isArray(ignoreStates) ? ignoreStates : (ignoreStates ? [ignoreStates] : []);
  const ignoreStatesHtml = ignoreStatesArr.length
    ? `<div class="grype-sec"><h3>Ignored fix states</h3>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">
          ${ignoreStatesArr.map((s) => `<span class="grype-pill flag">${esc(s)}</span>`).join('')}
        </div>
      </div>`
    : '';

  // Output
  const output = cfg.output || null;
  const outputFile = cfg.file || null;
  const outputHtml = (output || outputFile)
    ? `<div class="grype-sec"><h3>Output</h3>
        <div class="grype-kv">
          ${output ? `<span class="grype-k">format</span><span class="grype-v">${esc(output)}</span>` : ''}
          ${outputFile ? `<span class="grype-k">file</span><span class="grype-v">${esc(outputFile)}</span>` : ''}
        </div>
      </div>`
    : '';

  // Registry
  const registry = cfg.registry || {};
  const regInsecure = registry['insecure-skip-tls-verify'] ?? null;
  const regAuth = Array.isArray(registry.auth) ? registry.auth : (registry.auth ? [registry.auth] : []);
  let registryHtml = '';
  if (regInsecure !== null || regAuth.length) {
    const authRows = regAuth.map((a) => {
      const host = a.authority || a.hostname || '';
      return `<tr>
        <td>${esc(host)}</td>
        <td>${esc(a.username || '')}</td>
        <td class="grype-masked">${a.password || a.token ? '[configured]' : ''}</td>
      </tr>`;
    }).join('');
    registryHtml = `<div class="grype-sec"><h3>Registry</h3>
      <div class="grype-card">
        ${regInsecure !== null ? `<div class="grype-kv"><span class="grype-k">insecure-skip-tls-verify</span><span class="grype-v">${esc(String(regInsecure))}</span></div>` : ''}
        ${regAuth.length ? `<table class="grype-table" style="margin-top:6px;">
          <thead><tr><th>Host</th><th>Username</th><th>Password</th></tr></thead>
          <tbody>${authRows}</tbody>
        </table>` : ''}
      </div>
    </div>`;
  }

  // DB settings
  const db = cfg.db || {};
  const dbUpdateUrl = db['update-url'] || null;
  const dbAutoUpdate = db['auto-update'] ?? null;
  const dbHtml = (dbUpdateUrl || dbAutoUpdate !== null)
    ? `<div class="grype-sec"><h3>Database</h3>
        <div class="grype-card"><div class="grype-kv">
          ${dbUpdateUrl ? `<span class="grype-k">update-url</span><span class="grype-v">${esc(dbUpdateUrl)}</span>` : ''}
          ${dbAutoUpdate !== null ? `<span class="grype-k">auto-update</span><span class="grype-v">${esc(String(dbAutoUpdate))}</span>` : ''}
        </div></div>
      </div>`
    : '';

  // Flags
  const onlyFixed = cfg['only-fixed'] ?? null;
  const onlyNotFixed = cfg['only-notfixed'] ?? null;
  const quiet = cfg.quiet ?? null;
  const flags = [
    onlyFixed !== null && `<span class="grype-pill flag">only-fixed: ${esc(String(onlyFixed))}</span>`,
    onlyNotFixed !== null && `<span class="grype-pill flag">only-notfixed: ${esc(String(onlyNotFixed))}</span>`,
    quiet !== null && `<span class="grype-pill flag">quiet: ${esc(String(quiet))}</span>`,
  ].filter(Boolean);
  const flagsHtml = flags.length
    ? `<div class="grype-sec"><h3>Flags</h3><div style="display:flex;flex-wrap:wrap;gap:4px;">${flags.join('')}</div></div>`
    : '';

  const subParts = [
    failOnSev ? `fail-on: ${failOnSev}` : '',
    scope ? `scope: ${scope}` : '',
    ignoreList.length ? `${ignoreList.length} ignore rule${ignoreList.length !== 1 ? 's' : ''}` : '',
    output ? `format: ${output}` : '',
  ].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'grype-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="grype-title"><span class="grype-badge">Grype</span>Grype vulnerability scanner</div>
<div class="grype-sub">${esc(subParts.join(' · ') || 'Anchore Grype container/filesystem vulnerability scanner config')}</div>
${sevHtml}${scopeHtml}${ignoreHtml}${ignoreStatesHtml}${outputHtml}${registryHtml}${dbHtml}${flagsHtml}`;

  return { parentNode: host };
}
