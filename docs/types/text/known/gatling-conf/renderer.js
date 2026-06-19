const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gat-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-gat{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#cc2529;color:#fff;vertical-align:middle;margin-right:8px}
.gat-title{font-size:18px;font-weight:700;margin:0 0 4px}
.gat-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.gat-sec{margin:12px 0}
.gat-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.gat-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0}
.gat-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888)}
.gat-v{font:12px/1.6 ui-monospace,monospace;font-weight:600}
.gat-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}
.gat-pill{display:inline-flex;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.gat-on{color:#16a34a}.gat-off{color:#9ca3af}
.gat-flag{display:inline-flex;align-items:center;gap:5px;font-size:13px;padding:4px 10px;border-radius:8px;background:var(--bg-2,#f6f8fa);margin:3px 4px 3px 0}
`;

// HOCON-style parser: extract key = value or key = [list]
function hoconGet(text, keyPath) {
  // Build a regex for the last key in the path
  const key = keyPath.split('.').pop();
  const m = new RegExp(`\\b${key}\\s*=\\s*"?([^"\\n,}]+)"?`).exec(text);
  return m ? m[1].trim() : null;
}

function hoconList(text, key) {
  const m = new RegExp(`\\b${key}\\s*=\\s*\\[([^\\]]+)\\]`).exec(text);
  if (!m) return [];
  return [...m[1].matchAll(/["']?([a-zA-Z][a-zA-Z0-9._-]*)["']?/g)].map((x) => x[1]).filter(Boolean);
}

function extract(text) {
  const result = {
    outputDirectoryBaseName: null,
    simulationsFolder: null,
    resultsFolder: null,
    dataWriters: [],
    enableGA: null,
    connectionTimeout: null,
    readTimeout: null,
    maxConnectionsPerHost: null,
  };

  result.outputDirectoryBaseName = hoconGet(text, 'outputDirectoryBaseName');
  result.simulationsFolder = hoconGet(text, 'simulationsFolder');
  result.resultsFolder = hoconGet(text, 'resultsFolder');
  result.dataWriters = hoconList(text, 'writers');
  if (!result.dataWriters.length) result.dataWriters = hoconList(text, 'dataWriters');

  const gaM = /enableGA\s*=\s*(true|false)/i.exec(text);
  if (gaM) result.enableGA = gaM[1] === 'true';

  const ctM = /connectionTimeout\s*=\s*(\d+)/.exec(text);
  if (ctM) result.connectionTimeout = Number(ctM[1]);

  const rtM = /readTimeout\s*=\s*(\d+)/.exec(text);
  if (rtM) result.readTimeout = Number(rtM[1]);

  const mcpM = /maxConnectionsPerHost\s*=\s*(\d+)/.exec(text);
  if (mcpM) result.maxConnectionsPerHost = Number(mcpM[1]);

  return result;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const cfg = extract(text);

  const kvRows = [];
  if (cfg.simulationsFolder) kvRows.push(`<div class="gat-k">simulationsFolder</div><div class="gat-v">${esc(cfg.simulationsFolder)}</div>`);
  if (cfg.resultsFolder) kvRows.push(`<div class="gat-k">resultsFolder</div><div class="gat-v">${esc(cfg.resultsFolder)}</div>`);
  if (cfg.outputDirectoryBaseName) kvRows.push(`<div class="gat-k">outputDirectoryBaseName</div><div class="gat-v">${esc(cfg.outputDirectoryBaseName)}</div>`);
  if (cfg.connectionTimeout != null) kvRows.push(`<div class="gat-k">connectionTimeout</div><div class="gat-v">${esc(cfg.connectionTimeout)} ms</div>`);
  if (cfg.readTimeout != null) kvRows.push(`<div class="gat-k">readTimeout</div><div class="gat-v">${esc(cfg.readTimeout)} ms</div>`);
  if (cfg.maxConnectionsPerHost != null) kvRows.push(`<div class="gat-k">maxConnectionsPerHost</div><div class="gat-v">${esc(cfg.maxConnectionsPerHost)}</div>`);

  const settingsHtml = kvRows.length
    ? `<div class="gat-sec"><h3>Core Settings</h3><div class="gat-kv">${kvRows.join('')}</div></div>`
    : '';

  const writersHtml = cfg.dataWriters.length
    ? `<div class="gat-sec"><h3>Data Writers</h3><div class="gat-pills">${cfg.dataWriters.map((w) => `<span class="gat-pill">${esc(w)}</span>`).join('')}</div></div>`
    : '';

  const flags = [];
  if (cfg.enableGA !== null) {
    const on = cfg.enableGA;
    flags.push(`<span class="gat-flag"><span class="${on ? 'gat-on' : 'gat-off'}">${on ? '●' : '○'}</span> Google Analytics ${on ? 'enabled' : 'disabled'}</span>`);
  }
  const flagsHtml = flags.length
    ? `<div class="gat-sec"><h3>HTTP Settings</h3><div>${flags.join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'gat-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="gat-title"><span class="badge-gat">Gatling</span>gatling.conf</div>
<div class="gat-sub">Gatling load testing configuration (HOCON)</div>
${settingsHtml}${writersHtml}${flagsHtml}`;
  return { parentNode: host };
}
