// Valve KeyValues text format parser (ACF / VDF)
function parseKv(text) {
  const lines = text.split('\n');
  const root = {};
  const stack = [root];
  let pending = null;

  for (let raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('//')) continue;

    // Quoted string (key or value)
    const strings = [...line.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);

    if (line === '{') {
      const obj = {};
      const parent = stack[stack.length - 1];
      if (pending !== null) parent[pending] = obj;
      stack.push(obj);
      pending = null;
    } else if (line === '}') {
      stack.pop();
      pending = null;
    } else if (strings.length === 1) {
      pending = strings[0];
    } else if (strings.length >= 2) {
      stack[stack.length - 1][strings[0]] = strings[1];
      pending = null;
    }
  }

  // Unwrap top-level single key (e.g. "AppState")
  const keys = Object.keys(root);
  return keys.length === 1 ? { rootKey: keys[0], data: root[keys[0]] } : { rootKey: null, data: root };
}

const GAME_STATE = {
  1: 'Invalid', 2: 'Uninstalled', 4: 'Update Required', 8: 'Fully Installed',
  16: 'Encrypted', 32: 'Locked', 64: 'Files Missing', 128: 'App Running',
  256: 'Files Corrupt', 512: 'Update Running', 1024: 'Update Paused',
  2048: 'Update Started', 4096: 'Uninstalling', 8192: 'Backup Running',
};

function stateLabel(n) {
  const num = parseInt(n, 10);
  if (isNaN(num)) return n;
  const bits = Object.keys(GAME_STATE)
    .map(Number)
    .filter((k) => (num & k) === k && k !== 1)
    .map((k) => GAME_STATE[k]);
  return bits.length ? bits.join(', ') : `0x${num.toString(16)}`;
}

function fmt(ts) {
  const n = parseInt(ts, 10);
  if (!n) return null;
  try { return new Date(n * 1000).toLocaleString(); } catch { return ts; }
}

function bytes(b) {
  const n = parseInt(b, 10);
  if (isNaN(n) || n === 0) return null;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  return `${(n / 1024).toFixed(0)} KB`;
}

// Values come straight from the parsed KeyValues tree — a malicious ACF could set e.g. `name` to
// `<img src=x onerror=...>`. bodyHtml renders in a sandbox="allow-scripts" iframe (no allow-same-origin),
// so script tags can't reach the parent, but any element that eagerly fetches (img/link/etc.) would
// still make an off-origin request from inside that sandboxed context — escape every field.
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function row(label, value) {
  if (!value) return '';
  return `<tr><td class="acf-key">${label}</td><td>${value}</td></tr>`;
}

export function render(intake) {
  const text = intake.text || '';
  const { rootKey, data } = parseKv(text);

  if (!data || typeof data !== 'object') {
    return { bodyHtml: '<div class="acf-preview"><p class="acf-note">Could not parse Valve KeyValues.</p></div>' };
  }

  const appid = data.appid || data.AppId || null;
  const name = data.name || data.Name || null;
  const installdir = data.installdir || null;
  const state = data.StateFlags || data.stateflags || null;
  const lastUpdated = data.LastUpdated || data.lastupdated || null;
  const lastPlayed = data.LastPlayed || data.lastplayed || null;
  const sizeOnDisk = data.SizeOnDisk || data.sizeondisk || null;
  const buildId = data.buildid || null;
  const universe = data.Universe || data.universe || null;
  const platform = data.UserConfig?.platform || null;
  const branch = data.UserConfig?.BetaKey || null;

  const badge = rootKey ? `<span class="acf-badge">${esc(rootKey)}</span>` : '';
  const title = name ? `<span class="acf-title">${esc(name)}</span>` : '';

  const rows = [
    row('App ID', appid ? esc(appid) : null),
    row('Install Dir', installdir ? `<code>${esc(installdir)}</code>` : null),
    row('State', state ? esc(stateLabel(state)) : null),
    row('Size on Disk', bytes(sizeOnDisk)),
    row('Build ID', buildId ? esc(buildId) : null),
    row('Universe', universe ? esc(universe) : null),
    row('Platform', platform ? esc(platform) : null),
    row('Branch', branch ? esc(branch) : null),
    row('Last Updated', fmt(lastUpdated)),
    row('Last Played', fmt(lastPlayed)),
  ].filter(Boolean).join('');

  // Show any nested sub-objects (e.g. InstalledDepots)
  const depots = data.InstalledDepots || data.installeddepots || null;
  let depotsHtml = '';
  if (depots && typeof depots === 'object') {
    const ids = Object.keys(depots).slice(0, 10);
    depotsHtml = `<div class="acf-section"><div class="acf-label">Installed Depots (${Object.keys(depots).length})</div>
      <div class="acf-chips">${ids.map((id) => `<span class="acf-chip">${esc(id)}</span>`).join('')}${Object.keys(depots).length > 10 ? `<span class="acf-chip-more">+${Object.keys(depots).length - 10}</span>` : ''}</div></div>`;
  }

  const bodyHtml = `<div class="acf-preview">
  <div class="acf-header">${badge}${title}</div>
  ${rows ? `<table class="acf-table">${rows}</table>` : ''}
  ${depotsHtml}
</div>`;

  return { bodyHtml };
}
