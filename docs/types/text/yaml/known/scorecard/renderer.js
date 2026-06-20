import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.sc-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2da44e;color:#fff;vertical-align:middle;margin-right:8px;}
.sc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.sc-sec{margin:12px 0;}
.sc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.sc-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.sc-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.sc-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
.sc-pill{display:inline-flex;align-items:center;font-size:11px;padding:2px 9px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
.sc-pill.enabled{background:#f0fdf4;border-color:#86efac;color:#166534;}
.sc-pill.disabled{background:#fef2f2;border-color:#fca5a5;color:#991b1b;}
.sc-checks{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;}
.sc-probe{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:#eff6ff;border:1px solid #93c5fd;color:#1d4ed8;margin:2px;}
.sc-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:0 0 12px;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || \'\') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  // Checks configured
  const checks = Array.isArray(cfg.checks) ? cfg.checks : [];
  const probes = Array.isArray(cfg.probes) ? cfg.probes : [];

  // Output config
  const outputFormat = cfg.format || null;
  const outputFilename = cfg.output || null;

  // GitHub token env
  const githubToken = cfg['github-auth-token'] || cfg.github_auth_token || null;

  // Other fields
  const loglevel = cfg.loglevel || null;
  const resultsFile = cfg['results-file'] || cfg.results_file || null;
  const policy = cfg.policy || null;
  const repoPath = cfg.repo || cfg['local-repo'] || null;
  const commit = cfg.commit || null;
  const showDetails = cfg['show-details'] !== undefined ? cfg['show-details'] : null;

  // Checks section
  const enabledChecks = checks.filter((c) => c.enabled !== false);
  const disabledChecks = checks.filter((c) => c.enabled === false);

  const checksHtml = checks.length
    ? `<div class="sc-sec"><h3>Checks configured (${checks.length})</h3>
        <div class="sc-checks">
          ${checks.map((c) => {
            const name = c.name || c.id || '?';
            const enabled = c.enabled !== false;
            return `<span class="sc-pill ${enabled ? 'enabled' : 'disabled'}">${esc(name)}</span>`;
          }).join('')}
        </div>
        ${disabledChecks.length ? `<div style="font-size:12px;color:var(--fg-2,#888);margin-top:4px;">${disabledChecks.length} check${disabledChecks.length !== 1 ? 's' : ''} disabled</div>` : ''}
      </div>`
    : '';

  // Probes section
  const probesHtml = probes.length
    ? `<div class="sc-sec"><h3>Probes enabled (${probes.length})</h3>
        <div class="sc-checks">${probes.map((p) => `<span class="sc-probe">${esc(p)}</span>`).join('')}</div>
      </div>`
    : '';

  // Settings card
  const settingsRows = [
    outputFormat && `<span class="sc-k">output format</span><span class="sc-v">${esc(outputFormat)}</span>`,
    outputFilename && `<span class="sc-k">output file</span><span class="sc-v">${esc(outputFilename)}</span>`,
    resultsFile && `<span class="sc-k">results file</span><span class="sc-v">${esc(resultsFile)}</span>`,
    loglevel && `<span class="sc-k">log level</span><span class="sc-v">${esc(loglevel)}</span>`,
    repoPath && `<span class="sc-k">repo</span><span class="sc-v">${esc(repoPath)}</span>`,
    commit && `<span class="sc-k">commit</span><span class="sc-v">${esc(String(commit))}</span>`,
    policy && `<span class="sc-k">policy</span><span class="sc-v">${esc(typeof policy === 'string' ? policy : JSON.stringify(policy))}</span>`,
    showDetails !== null && `<span class="sc-k">show-details</span><span class="sc-v">${esc(String(showDetails))}</span>`,
    githubToken && `<span class="sc-k">github-auth-token</span><span class="sc-v">${esc(githubToken)}</span>`,
  ].filter(Boolean);

  const settingsHtml = settingsRows.length
    ? `<div class="sc-sec"><h3>Settings</h3><div class="sc-card"><div class="sc-kv">${settingsRows.join('')}</div></div></div>`
    : '';

  const subParts = [
    checks.length ? `${checks.length} check${checks.length !== 1 ? 's' : ''} configured` : '',
    probes.length ? `${probes.length} probe${probes.length !== 1 ? 's' : ''}` : '',
    outputFormat ? `format: ${outputFormat}` : '',
  ].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'sc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="sc-title"><span class="sc-badge">Scorecard</span>OpenSSF Scorecard</div>
<div class="sc-sub">${esc(subParts.join(' · ') || 'OpenSSF Scorecard security health metrics config')}</div>
${checksHtml}${probesHtml}${settingsHtml}`;

  return { parentNode: host };
}
