const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.wpcagent-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.wpcagent-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f97316;color:#fff;vertical-align:middle;margin-right:8px;}
.wpcagent-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.wpcagent-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.wpcagent-sec{margin:12px 0;}
.wpcagent-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.wpcagent-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.wpcagent-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.wpcagent-key{color:var(--fg-2,#888);font-size:12px;min-width:260px;flex-shrink:0;}
.wpcagent-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.wpcagent-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.wpcagent-chip-orange{background:#fff7ed;border-color:#f97316;color:#c2410c;}
.wpcagent-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.wpcagent-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.wpcagent-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

/** Parse KEY=VALUE env file; skip # comments and blank lines. Handles optional `export ` prefix. */
function parseKV(text) {
  const out = {};
  for (const raw of (text || '').split('\n')) {
    let line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('export ')) line = line.slice(7).trim();
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && !(key in out)) out[key] = val;
  }
  return out;
}

function chip(val, cls) {
  if (val == null || val === '') return '';
  const s = String(val);
  return `<span class="wpcagent-chip${cls ? ' wpcagent-chip-' + cls : ''}">${esc(s.length > 80 ? s.slice(0, 77) + '…' : s)}</span>`;
}

function masked() {
  return '<span class="wpcagent-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="wpcagent-row"><span class="wpcagent-key">${esc(label)}</span><span class="wpcagent-val">${html}</span></div>`;
}

/** Returns true if the key name suggests it is a secret and should be masked. */
function isSensitive(key) {
  return /SECRET|PASSWORD|PASS|TOKEN|API_?KEY|PRIVATE/i.test(key);
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'wpcagent-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const kv = parseKV(intake.text || '');

  const server = kv.WOODPECKER_SERVER || '';
  const title = server || 'Woodpecker CI Agent';

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="wpcagent-badge">Woodpecker CI Agent</span>
      <span class="wpcagent-title">${esc(title)}</span>
    </div>
    <div class="wpcagent-sub">Woodpecker CI agent environment configuration</div>
  `;
  host.appendChild(header);

  let body = '';

  // Connection
  const connRows = [
    kv.WOODPECKER_SERVER ? row('WOODPECKER_SERVER', chip(kv.WOODPECKER_SERVER, 'orange')) : '',
    kv.WOODPECKER_HOSTNAME ? row('WOODPECKER_HOSTNAME', chip(kv.WOODPECKER_HOSTNAME)) : '',
  ].filter(Boolean).join('');
  if (connRows) body += `<div class="wpcagent-sec"><h3>Connection</h3><div class="wpcagent-card">${connRows}</div></div>`;

  // Auth
  const authRows = [
    kv.WOODPECKER_AGENT_SECRET != null ? row('WOODPECKER_AGENT_SECRET', masked()) : '',
  ].filter(Boolean).join('');
  if (authRows) body += `<div class="wpcagent-sec"><h3>Auth</h3><div class="wpcagent-card">${authRows}</div></div>`;

  // Capacity
  const capRows = [
    kv.WOODPECKER_MAX_PROCS ? row('WOODPECKER_MAX_PROCS', chip(kv.WOODPECKER_MAX_PROCS, 'blue')) : '',
  ].filter(Boolean).join('');
  if (capRows) body += `<div class="wpcagent-sec"><h3>Capacity</h3><div class="wpcagent-card">${capRows}</div></div>`;

  // Logging
  const logRows = [
    kv.WOODPECKER_LOG_LEVEL ? row('WOODPECKER_LOG_LEVEL', chip(kv.WOODPECKER_LOG_LEVEL, 'blue')) : '',
  ].filter(Boolean).join('');
  if (logRows) body += `<div class="wpcagent-sec"><h3>Logging</h3><div class="wpcagent-card">${logRows}</div></div>`;

  // Backend
  const backendRows = [
    kv.WOODPECKER_BACKEND ? row('WOODPECKER_BACKEND', chip(kv.WOODPECKER_BACKEND, 'green')) : '',
  ].filter(Boolean).join('');
  if (backendRows) body += `<div class="wpcagent-sec"><h3>Backend</h3><div class="wpcagent-card">${backendRows}</div></div>`;

  // Docker
  const dockerRows = [
    kv.WOODPECKER_BACKEND_DOCKER_NETWORK ? row('WOODPECKER_BACKEND_DOCKER_NETWORK', chip(kv.WOODPECKER_BACKEND_DOCKER_NETWORK)) : '',
    kv.WOODPECKER_BACKEND_DOCKER_VOLUMES ? row('WOODPECKER_BACKEND_DOCKER_VOLUMES', chip(kv.WOODPECKER_BACKEND_DOCKER_VOLUMES)) : '',
  ].filter(Boolean).join('');
  if (dockerRows) body += `<div class="wpcagent-sec"><h3>Docker</h3><div class="wpcagent-card">${dockerRows}</div></div>`;

  // Labels
  const labelRows = [
    kv.WOODPECKER_FILTER_LABELS ? row('WOODPECKER_FILTER_LABELS', chip(kv.WOODPECKER_FILTER_LABELS)) : '',
  ].filter(Boolean).join('');
  if (labelRows) body += `<div class="wpcagent-sec"><h3>Labels</h3><div class="wpcagent-card">${labelRows}</div></div>`;

  // Catch any remaining WOODPECKER_* keys that contain sensitive info
  const extraRows = Object.entries(kv)
    .filter(([k]) => k.startsWith('WOODPECKER_') && isSensitive(k) &&
      !['WOODPECKER_AGENT_SECRET'].includes(k))
    .map(([k]) => row(k, masked()))
    .join('');
  if (extraRows) body += `<div class="wpcagent-sec"><h3>Secrets</h3><div class="wpcagent-card">${extraRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No Woodpecker agent configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
