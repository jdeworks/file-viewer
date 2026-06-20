import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.dozzle-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.dozzle-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#ff6600;color:#fff;vertical-align:middle;margin-right:8px;}
.dozzle-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.dozzle-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.dozzle-sec{margin:14px 0;}
.dozzle-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.dozzle-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.dozzle-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:12px;}
.dozzle-kv-k{color:var(--fg-2,#888);min-width:140px;font-family:ui-monospace,monospace;flex-shrink:0;}
.dozzle-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.dozzle-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);}
.dozzle-chip-on{background:#dcfce7;border-color:#86efac;color:#166534;}
.dozzle-chip-off{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.dozzle-chip-info{background:#eff6ff;border-color:#93c5fd;color:#1e40af;}
.dozzle-chip-warn{background:#fefce8;border-color:#fde047;color:#854d0e;}
.dozzle-chip-err{background:#fef2f2;border-color:#fca5a5;color:#991b1b;}
.dozzle-host-card{border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:8px 12px;margin:5px 0;background:var(--bg,#fff);}
.dozzle-host-label{font-size:12px;font-weight:600;color:var(--fg-2,#888);margin:0 0 3px;}
`;

function kv(label, html) {
  if (!html) return '';
  return `<div class="dozzle-kv"><span class="dozzle-kv-k">${esc(label)}</span><span class="dozzle-kv-v">${html}</span></div>`;
}

function levelChip(level) {
  if (!level) return '';
  const l = String(level).toLowerCase();
  const cls = l === 'debug' ? 'dozzle-chip-warn' : l === 'info' ? 'dozzle-chip-info' : l === 'warn' || l === 'warning' ? 'dozzle-chip-warn' : l === 'error' ? 'dozzle-chip-err' : 'dozzle-chip';
  return `<span class="dozzle-chip ${cls}">${esc(level)}</span>`;
}

function boolChip(v, trueLabel, falseLabel) {
  const s = String(v ?? '').toLowerCase();
  if (s === 'true' || s === '1' || s === 'yes') return `<span class="dozzle-chip dozzle-chip-on">${esc(trueLabel || 'true')}</span>`;
  if (s === 'false' || s === '0' || s === 'no') return `<span class="dozzle-chip dozzle-chip-off">${esc(falseLabel || 'false')}</span>`;
  return `<span class="dozzle-chip">${esc(String(v))}</span>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const auth = cfg.auth || {};
  const remote = cfg.remote || [];

  // ── Server section ──
  const addr = cfg.addr != null ? String(cfg.addr) : '';
  const base = cfg.base != null ? String(cfg.base) : '';
  const hostname = cfg.hostname != null ? String(cfg.hostname) : '';
  const serverRows = [
    addr ? kv('addr', `<span class="dozzle-kv-v">${esc(addr)}</span>`) : '',
    base ? kv('base', `<span class="dozzle-kv-v">${esc(base)}</span>`) : '',
    hostname ? kv('hostname', `<span class="dozzle-kv-v">${esc(hostname)}</span>`) : '',
  ].filter(Boolean).join('');
  const serverHtml = serverRows ? `<div class="dozzle-sec"><h3>Server</h3><div class="dozzle-card">${serverRows}</div></div>` : '';

  // ── Auth section ──
  const authEnabled = cfg.auth != null ? auth : null;
  const provider = auth.provider != null ? String(auth.provider) : '';
  const users = auth.users != null ? auth.users : null;
  const userCount = users && typeof users === 'object' ? Object.keys(users).length : null;
  const authRows = [
    provider ? kv('provider', `<span class="dozzle-kv-v">${esc(provider)}</span>`) : '',
    userCount != null ? kv('users', `<span class="dozzle-chip dozzle-chip-info">${esc(String(userCount))} user${userCount !== 1 ? 's' : ''}</span>`) : '',
  ].filter(Boolean).join('');
  const authHtml = (provider || userCount != null) ? `<div class="dozzle-sec"><h3>Auth</h3><div class="dozzle-card">${authRows}</div></div>` : '';

  // ── Logging section ──
  const level = cfg.level != null ? String(cfg.level) : '';
  const noAnalytics = cfg.noAnalytics;
  const loggingRows = [
    level ? kv('level', levelChip(level)) : '',
    noAnalytics != null ? kv('noAnalytics', boolChip(noAnalytics, 'enabled', 'disabled')) : '',
  ].filter(Boolean).join('');
  const loggingHtml = loggingRows ? `<div class="dozzle-sec"><h3>Logging</h3><div class="dozzle-card">${loggingRows}</div></div>` : '';

  // ── Remote hosts section ──
  const remoteArr = Array.isArray(remote) ? remote : (remote ? [remote] : []);
  let remoteHtml = '';
  if (remoteArr.length) {
    const cards = remoteArr.map((r) => {
      const rUrl = r.url != null ? String(r.url) : '';
      const rLabel = r.label != null ? String(r.label) : '';
      return `<div class="dozzle-host-card">
${rLabel ? `<div class="dozzle-host-label">${esc(rLabel)}</div>` : ''}
${rUrl ? `<div class="dozzle-kv"><span class="dozzle-kv-k">url</span><span class="dozzle-kv-v">${esc(rUrl)}</span></div>` : ''}
</div>`;
    }).join('');
    remoteHtml = `<div class="dozzle-sec"><h3>Remote Hosts</h3>${cards}</div>`;
  }

  // ── Sub-summary ──
  const subParts = [];
  if (addr) subParts.push(`listen ${addr}`);
  if (level) subParts.push(`log: ${level}`);
  if (provider) subParts.push(`auth: ${provider}`);
  if (remoteArr.length) subParts.push(`${remoteArr.length} remote agent${remoteArr.length !== 1 ? 's' : ''}`);
  const sub = subParts.join(' · ');

  const isEmpty = !serverHtml && !authHtml && !loggingHtml && !remoteHtml;
  const emptyHtml = isEmpty ? '<p style="color:var(--fg-2,#888);font-size:13px;">No Dozzle configuration keys found.</p>' : '';

  const host = document.createElement('div');
  host.className = 'dozzle-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="margin-bottom:4px;">
  <span class="dozzle-badge">Dozzle</span>
  <span class="dozzle-title">dozzle.yaml</span>
</div>
<div class="dozzle-sub">${esc(sub)}</div>
${serverHtml}${authHtml}${loggingHtml}${remoteHtml}${emptyHtml}`;

  return { parentNode: host };
}
