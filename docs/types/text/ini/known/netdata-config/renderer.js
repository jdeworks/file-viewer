import { parseIni } from '../../renderer.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.netdata-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-netdata{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00AB44;color:#fff;vertical-align:middle;margin-right:8px;}
.netdata-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.netdata-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.netdata-sec{margin:14px 0;}
.netdata-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.netdata-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.netdata-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.netdata-kv-k{color:var(--fg-2,#888);min-width:180px;flex-shrink:0;font:12px/1.6 ui-monospace,monospace;}
.netdata-kv-v{font:12px/1.6 ui-monospace,monospace;word-break:break-all;}
.netdata-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
.netdata-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.netdata-pill.on{background:#dcfce7;border-color:#86efac;color:#166534;}
.netdata-pill.off{background:#fef2f2;border-color:#fca5a5;color:#991b1b;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="netdata-kv"><span class="netdata-kv-k">${esc(label)}</span><span class="netdata-kv-v">${esc(value)}</span></div>`;
}

function sectionMap(sections) {
  const m = {};
  for (const s of sections) {
    const key = (s.name || '').toLowerCase();
    const pairs = {};
    for (const p of s.pairs) pairs[p.key.toLowerCase()] = p.value;
    m[key] = pairs;
  }
  return m;
}

export function render(intake) {
  const sections = parseIni(intake.text || '');
  const cfg = sectionMap(sections);

  // [global]
  const global = cfg['global'] || {};
  const hostname = global['hostname'] || '';
  const updateEvery = global['update every'] || '';
  const history = global['history'] || '';
  const dbMode = global['memory mode'] || '';
  const timezone = global['timezone'] || '';
  const configDir = global['config directory'] || '';
  const globalHtml = (hostname || updateEvery || history || dbMode || timezone) ? `
<div class="netdata-sec"><h3>Global</h3><div class="netdata-card">
${kv('hostname', hostname)}
${kv('update every', updateEvery ? updateEvery + 's' : '')}
${kv('history', history)}
${kv('memory mode', dbMode)}
${kv('timezone', timezone)}
${kv('config directory', configDir)}
</div></div>` : '';

  // [web]
  const web = cfg['web'] || {};
  const bindTo = web['bind to'] || '';
  const port = web['port'] || '';
  const allowFrom = web['allow connections from'] || '';
  const webHtml = (bindTo || port || allowFrom) ? `
<div class="netdata-sec"><h3>Web</h3><div class="netdata-card">
${kv('bind to', bindTo)}
${kv('port', port)}
${kv('allow connections from', allowFrom)}
</div></div>` : '';

  // [plugins]
  const plugins = cfg['plugins'] || {};
  const pluginEntries = Object.entries(plugins);
  let pluginsHtml = '';
  if (pluginEntries.length) {
    const pills = pluginEntries.map(([name, val]) => {
      const on = val === 'yes' || val === 'true' || val === '1';
      const off = val === 'no' || val === 'false' || val === '0';
      const cls = on ? 'on' : off ? 'off' : '';
      return `<span class="netdata-pill ${cls}">${esc(name)}: ${esc(val)}</span>`;
    }).join('');
    pluginsHtml = `<div class="netdata-sec"><h3>Plugins</h3><div class="netdata-pills">${pills}</div></div>`;
  }

  // [db]
  const db = cfg['db'] || {};
  const dbEngine = db['mode'] || db['engine'] || '';
  const retention = db['retention'] || '';
  const dbHtml = (dbEngine || retention) ? `
<div class="netdata-sec"><h3>DB</h3><div class="netdata-card">
${kv('engine', dbEngine)}
${kv('retention', retention ? retention + ' days' : '')}
</div></div>` : '';

  // Sub-summary
  const subParts = [];
  if (hostname) subParts.push(hostname);
  if (updateEvery) subParts.push(`update every ${updateEvery}s`);
  if (port) subParts.push(`:${port}`);
  if (dbEngine) subParts.push(`db: ${dbEngine}`);
  const sub = subParts.join(' · ');

  const host = document.createElement('div');
  host.className = 'netdata-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-netdata">Netdata</span>
  <span class="netdata-title">${esc(hostname || 'netdata.conf')}</span>
</div>
<div class="netdata-sub">${esc(sub || 'Netdata monitoring configuration')}</div>
${globalHtml}${webHtml}${pluginsHtml}${dbHtml}`;

  return { parentNode: host };
}
