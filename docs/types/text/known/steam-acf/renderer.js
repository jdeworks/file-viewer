const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.steam-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.steam-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1b2838;color:#fff;vertical-align:middle;margin-right:8px;}
.steam-title{font-size:18px;font-weight:700;margin:0 0 2px;}
.steam-appid{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.steam-card{border:1px solid var(--border,#e0e0e0);border-radius:10px;overflow:hidden;margin:0 0 14px;background:var(--bg,#fff);}
.steam-card-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);padding:8px 14px;border-bottom:1px solid var(--border,#e8e8e8);}
.steam-row{display:flex;gap:8px;align-items:baseline;padding:5px 14px;border-bottom:1px solid var(--border,#f0f0f0);font-size:13px;}
.steam-row:last-child{border-bottom:none;}
.steam-key{color:var(--fg-2,#888);min-width:160px;flex-shrink:0;font-size:12px;}
.steam-val{font-family:ui-monospace,monospace;word-break:break-all;}
.steam-chip{display:inline-block;padding:1px 10px;border-radius:8px;font-size:11px;font-weight:700;}
.steam-chip-green{background:#dcfce7;color:#14532d;border:1px solid #86efac;}
.steam-chip-amber{background:#fef3c7;color:#78350f;border:1px solid #fcd34d;}
.steam-chip-gray{background:#f3f4f6;color:#374151;border:1px solid #d1d5db;}
.steam-depot-table{width:100%;border-collapse:collapse;font-size:12px;}
.steam-depot-table td{padding:4px 14px;border-bottom:1px solid var(--border,#f0f0f0);}
.steam-depot-table tr:last-child td{border-bottom:none;}
.steam-depot-id{font-family:ui-monospace,monospace;color:var(--fg-2,#888);}
.steam-more{padding:5px 14px;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

function parseKv(text) {
  const tokens = [];
  const re = /"((?:[^"\\]|\\.)*)"|([{}])/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    tokens.push(m[1] !== undefined ? m[1] : m[2]);
  }

  const root = {};
  const stack = [root];
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (tok === '{') { i++; continue; }
    if (tok === '}') { stack.pop(); i++; continue; }
    const next = tokens[i + 1];
    if (next === '{') {
      const obj = {};
      stack[stack.length - 1][tok] = obj;
      stack.push(obj);
      i += 2;
    } else if (next !== undefined && next !== '{' && next !== '}') {
      stack[stack.length - 1][tok] = next;
      i += 2;
    } else {
      i++;
    }
  }

  const keys = Object.keys(root);
  return keys.length === 1 ? { rootKey: keys[0], data: root[keys[0]] } : { rootKey: null, data: root };
}

function stateLabel(n) {
  const STATE_FLAGS = {
    4: 'Fully Installed',
    6: 'Updating',
    1: 'Invalid',
    2: 'Uninstalled',
    8: 'Fully Installed',
    64: 'Files Missing',
    128: 'App Running',
    256: 'Files Corrupt',
    512: 'Update Running',
    1024: 'Update Paused',
  };
  const num = parseInt(n, 10);
  if (isNaN(num)) return { label: String(n), cls: 'steam-chip-gray' };
  // Common combined values
  if (num === 4 || num === 8) return { label: 'Fully Installed', cls: 'steam-chip-green' };
  if (num === 6 || (num & 512)) return { label: 'Updating', cls: 'steam-chip-amber' };
  if (num === 2) return { label: 'Uninstalled', cls: 'steam-chip-gray' };
  const known = STATE_FLAGS[num];
  if (known) return { label: known, cls: 'steam-chip-gray' };
  return { label: `StateFlags: ${num}`, cls: 'steam-chip-gray' };
}

function fmtBytes(b) {
  const n = parseInt(b, 10);
  if (isNaN(n) || n === 0) return null;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  return `${(n / 1024).toFixed(0)} KB`;
}

function fmtDate(ts) {
  const n = parseInt(ts, 10);
  if (!n) return null;
  try { return new Date(n * 1000).toLocaleString(); } catch { return ts; }
}

function row(label, valueHtml) {
  if (!valueHtml) return '';
  return `<div class="steam-row"><span class="steam-key">${esc(label)}</span><span class="steam-val">${valueHtml}</span></div>`;
}

export function render(intake) {
  const text = intake.text || '';
  const { rootKey, data } = parseKv(text);

  if (!data || typeof data !== 'object') {
    const host = document.createElement('div');
    host.className = 'steam-doc';
    host.innerHTML = `<style>${CSS}</style><div class="steam-title"><span class="steam-badge">acf</span>Steam App Manifest</div><div class="steam-appid">Could not parse Valve KeyValues format.</div>`;
    return { parentNode: host };
  }

  const appid = data.appid || data.AppId || '';
  const name = data.name || data.Name || (rootKey || 'App Manifest');
  const installdir = data.installdir || '';
  const stateFlags = data.StateFlags || data.stateflags || '';
  const lastUpdated = data.LastUpdated || data.lastupdated || '';
  const sizeOnDisk = data.SizeOnDisk || data.sizeondisk || '';
  const buildid = data.buildid || '';
  const autoUpdate = data.AutoUpdateBehavior || '';
  const language = (data.UserConfig || {}).language || '';

  const { label: stateText, cls: stateCls } = stateFlags ? stateLabel(stateFlags) : { label: '', cls: '' };
  const stateChip = stateText ? `<span class="steam-chip ${stateCls}">${esc(stateText)}</span>` : '';

  const mainRows = [
    stateChip ? row('State', stateChip) : '',
    row('Install directory', installdir ? `<code>${esc(installdir)}</code>` : ''),
    row('Size on disk', fmtBytes(sizeOnDisk) ? esc(fmtBytes(sizeOnDisk)) : ''),
    row('Last updated', fmtDate(lastUpdated) ? esc(fmtDate(lastUpdated)) : ''),
    row('Build ID', buildid ? esc(buildid) : ''),
    row('Language', language ? esc(language) : ''),
    row('Auto-update', autoUpdate === '0' ? 'Always keep up to date' : autoUpdate === '1' ? 'Only update on launch' : autoUpdate ? esc(autoUpdate) : ''),
  ].filter(Boolean).join('');

  // Depots
  const depots = data.InstalledDepots || data.installeddepots || null;
  let depotsHtml = '';
  if (depots && typeof depots === 'object') {
    const ids = Object.keys(depots);
    const shown = ids.slice(0, 5);
    const extra = ids.length - shown.length;
    const depotRows = shown.map((id) => {
      const depot = depots[id];
      const size = depot && depot.size ? fmtBytes(depot.size) : null;
      return `<tr><td class="steam-depot-id">${esc(id)}</td><td>${size ? esc(size) : '—'}</td></tr>`;
    }).join('');
    const moreRow = extra > 0 ? `<div class="steam-more">…and ${extra} more depots</div>` : '';
    depotsHtml = `<div class="steam-card"><div class="steam-card-title">Installed Depots (${ids.length})</div><table class="steam-depot-table">${depotRows}</table>${moreRow}</div>`;
  }

  const host = document.createElement('div');
  host.className = 'steam-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="steam-title"><span class="steam-badge">acf</span>${esc(name)}</div>
${appid ? `<div class="steam-appid">App ID: ${esc(appid)}</div>` : ''}
${mainRows ? `<div class="steam-card"><div class="steam-card-title">Details</div>${mainRows}</div>` : ''}
${depotsHtml}`;

  return { parentNode: host };
}
