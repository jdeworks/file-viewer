import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.trivyyaml-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.trivyyaml-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1904DA;color:#fff;vertical-align:middle;margin-right:8px;}
.trivyyaml-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.trivyyaml-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.trivyyaml-sec{margin:12px 0;}
.trivyyaml-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.trivyyaml-pill{display:inline-flex;align-items:center;font-size:11px;padding:2px 9px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
.trivyyaml-pill.crit{background:#fef2f2;border-color:#fca5a5;color:#991b1b;}
.trivyyaml-pill.high{background:#fff7ed;border-color:#fdba74;color:#c2410c;}
.trivyyaml-pill.med{background:#fefce8;border-color:#fde047;color:#854d0e;}
.trivyyaml-pill.low{background:#f0fdf4;border-color:#86efac;color:#166534;}
.trivyyaml-pill.scanner{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8;}
.trivyyaml-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.trivyyaml-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.trivyyaml-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
.trivyyaml-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:0 0 12px;}
.trivyyaml-vuln-id{font:11px/1.4 ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:1px 6px;margin:1px;}
`;

const SEV_CLASS = { CRITICAL: 'crit', HIGH: 'high', MEDIUM: 'med', LOW: 'low' };

function getSeverities(cfg) {
  const sev = cfg.severity || cfg.scan?.severity || cfg.vulnerability?.severity || [];
  if (Array.isArray(sev)) return sev;
  if (typeof sev === 'string') return sev.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

function getScanners(cfg) {
  const scanners = cfg.scanners || cfg['security-checks'] || cfg.scan?.scanners || cfg.scan?.['security-checks'] || [];
  if (Array.isArray(scanners)) return scanners;
  if (typeof scanners === 'string') return scanners.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

function getIgnoredVulns(cfg) {
  const list = cfg['ignored-vulnerabilities'] || cfg.vulnerability?.['ignored-vulnerabilities'] || [];
  if (Array.isArray(list)) return list;
  return [];
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const severities = getSeverities(cfg);
  const scanners = getScanners(cfg);
  const ignoredVulns = getIgnoredVulns(cfg);

  // Output format / settings
  const format = cfg.format || cfg.scan?.format || null;
  const output = cfg.output || null;
  const exitCode = cfg['exit-code'] ?? cfg.exitCode ?? null;
  const ignoreUnfixed = cfg['ignore-unfixed'] ?? cfg.vulnerability?.['ignore-unfixed'] ?? cfg.ignoreUnfixed ?? null;
  const timeout = cfg.timeout || null;
  const cacheDir = cfg['cache-dir'] || null;

  // Vulnerability type (os/library)
  const vulnType = cfg.vulnerability?.type || [];
  const vulnTypeArr = Array.isArray(vulnType) ? vulnType : (typeof vulnType === 'string' ? vulnType.split(',').map(s => s.trim()).filter(Boolean) : []);

  // Misconfiguration
  const misconfigIncludeNonFailures = cfg.misconfiguration?.['include-non-failures'] ?? cfg.misconfig?.['include-non-failures'] ?? null;

  // Secret config
  const secretConfig = cfg.secret?.config || null;

  // Scan target
  const scanTarget = cfg.scan?.target || null;

  // Severity chips
  const severitiesHtml = severities.length
    ? `<div class="trivyyaml-sec"><h3>Severity filters (${severities.length})</h3>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">
          ${severities.map((s) => {
            const cls = SEV_CLASS[s.toUpperCase()] || '';
            return `<span class="trivyyaml-pill ${cls}">${esc(s)}</span>`;
          }).join('')}
        </div>
      </div>`
    : '';

  // Scanners
  const scannersHtml = scanners.length
    ? `<div class="trivyyaml-sec"><h3>Scanners enabled (${scanners.length})</h3>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">
          ${scanners.map((s) => `<span class="trivyyaml-pill scanner">${esc(s)}</span>`).join('')}
        </div>
      </div>`
    : '';

  // Vulnerability type chips
  const vulnTypeHtml = vulnTypeArr.length
    ? `<div class="trivyyaml-sec"><h3>Vulnerability types</h3>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">
          ${vulnTypeArr.map((t) => `<span class="trivyyaml-pill">${esc(t)}</span>`).join('')}
        </div>
      </div>`
    : '';

  // Ignored vulns
  const ignoredHtml = ignoredVulns.length
    ? `<div class="trivyyaml-sec"><h3>Ignored vulnerabilities (${ignoredVulns.length})</h3>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">
          ${ignoredVulns.slice(0, 50).map((v) => {
            const id = typeof v === 'string' ? v : (v.id || v['vulnerability-id'] || JSON.stringify(v));
            return `<span class="trivyyaml-vuln-id">${esc(id)}</span>`;
          }).join('')}
          ${ignoredVulns.length > 50 ? `<span style="font-size:12px;color:var(--fg-2,#888);">…and ${ignoredVulns.length - 50} more</span>` : ''}
        </div>
      </div>`
    : '';

  // Settings
  const settingsRows = [
    scanTarget && `<span class="trivyyaml-k">scan target</span><span class="trivyyaml-v">${esc(scanTarget)}</span>`,
    format && `<span class="trivyyaml-k">format</span><span class="trivyyaml-v">${esc(format)}</span>`,
    output && `<span class="trivyyaml-k">output</span><span class="trivyyaml-v">${esc(output)}</span>`,
    exitCode !== null && exitCode !== undefined && `<span class="trivyyaml-k">exit-code</span><span class="trivyyaml-v">${esc(String(exitCode))}</span>`,
    ignoreUnfixed !== null && ignoreUnfixed !== undefined && `<span class="trivyyaml-k">ignore-unfixed</span><span class="trivyyaml-v">${esc(String(ignoreUnfixed))}</span>`,
    misconfigIncludeNonFailures !== null && misconfigIncludeNonFailures !== undefined && `<span class="trivyyaml-k">include-non-failures</span><span class="trivyyaml-v">${esc(String(misconfigIncludeNonFailures))}</span>`,
    secretConfig && `<span class="trivyyaml-k">secret config</span><span class="trivyyaml-v">${esc(secretConfig)}</span>`,
    timeout && `<span class="trivyyaml-k">timeout</span><span class="trivyyaml-v">${esc(String(timeout))}</span>`,
    cacheDir && `<span class="trivyyaml-k">cache-dir</span><span class="trivyyaml-v">${esc(cacheDir)}</span>`,
  ].filter(Boolean);

  const settingsHtml = settingsRows.length
    ? `<div class="trivyyaml-sec"><h3>Settings</h3><div class="trivyyaml-card"><div class="trivyyaml-kv">${settingsRows.join('')}</div></div></div>`
    : '';

  const subParts = [
    severities.length ? severities.join(', ') : '',
    scanners.length ? `${scanners.length} scanner${scanners.length !== 1 ? 's' : ''}` : '',
    ignoredVulns.length ? `${ignoredVulns.length} ignored vuln${ignoredVulns.length !== 1 ? 's' : ''}` : '',
    format ? `format: ${format}` : '',
  ].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'trivyyaml-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="trivyyaml-title"><span class="trivyyaml-badge">Trivy</span>Trivy security scanner config</div>
<div class="trivyyaml-sub">${esc(subParts.join(' · ') || 'Trivy all-in-one vulnerability scanner config')}</div>
${severitiesHtml}${scannersHtml}${vulnTypeHtml}${ignoredHtml}${settingsHtml}`;

  return { parentNode: host };
}
