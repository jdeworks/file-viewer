const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.netdatacfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-netdata{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00AB44;color:#fff;vertical-align:middle;margin-right:8px;}
.netdatacfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.netdatacfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.netdatacfg-sec{margin:12px 0;}
.netdatacfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.netdatacfg-card{padding:10px 14px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin-bottom:8px;}
.netdatacfg-row{display:flex;gap:8px;align-items:baseline;padding:3px 0;font-size:13px;border-bottom:1px solid var(--border,#e0e0e0);}
.netdatacfg-row:last-child{border-bottom:none;}
.netdatacfg-key{color:var(--fg-2,#888);min-width:200px;font-size:12px;}
.netdatacfg-val{font:12px/1.4 ui-monospace,monospace;color:var(--fg,#24292f);}
.netdatacfg-chips{display:flex;flex-wrap:wrap;gap:5px;padding:4px 0;}
.chip-yes{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:#d1fae5;color:#065f46;}
.chip-no{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:var(--bg-3,#f1f1f1);color:var(--fg-2,#888);}
`;

function parseIni(text) {
  const sections = {};
  let current = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const secMatch = line.match(/^\[([^\]]+)\]/);
    if (secMatch) {
      current = secMatch[1].trim().toLowerCase();
      sections[current] = sections[current] || {};
      continue;
    }
    if (current == null) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim().toLowerCase();
    const val = line.slice(eq + 1).trim();
    sections[current][key] = val;
  }
  return sections;
}

function row(label, val) {
  if (val == null) return '';
  return `<div class="netdatacfg-row"><span class="netdatacfg-key">${esc(label)}</span><span class="netdatacfg-val">${esc(val)}</span></div>`;
}

export function render(intake) {
  const text = intake.text || '';
  const sections = parseIni(text);

  const global = sections['global'] || {};
  const web = sections['web'] || {};
  const health = sections['health'] || {};
  const backend = sections['backend'] || sections['exporting'] || {};
  const plugins = sections['plugins'] || {};

  const hasWeb = Object.keys(web).length > 0;
  const hasBackend = Object.keys(backend).length > 0;
  const hasPlugins = Object.keys(plugins).length > 0;

  // Global card
  const globalRows = [
    row('hostname', global['hostname']),
    row('update every (seconds)', global['update every']),
    row('memory mode', global['memory mode']),
    row('history (entries)', global['history']),
    row('bind socket to IP', global['bind socket to ip']),
    row('run as user', global['run as user']),
    row('web files owner', global['web files owner']),
  ].filter(Boolean).join('');

  const globalHtml = globalRows
    ? `<div class="netdatacfg-sec"><h3>Global</h3><div class="netdatacfg-card">${globalRows}</div></div>`
    : '';

  // Web card
  const webRows = [
    row('bind to', web['bind to']),
    row('web files owner', web['web files owner']),
    row('disconnect idle clients after (s)', web['disconnect idle clients after seconds']),
    row('allow connections from', web['allow connections from']),
  ].filter(Boolean).join('');

  const webHtml = hasWeb && webRows
    ? `<div class="netdatacfg-sec"><h3>Web</h3><div class="netdatacfg-card">${webRows}</div></div>`
    : '';

  // Health
  const healthEnabled = health['enabled'];
  const healthRows = [
    row('enabled', healthEnabled),
    row('health configuration directory', health['health configuration directory']),
    row('run at least every (seconds)', health['run at least every seconds']),
  ].filter(Boolean).join('');

  const healthHtml = healthRows
    ? `<div class="netdatacfg-sec"><h3>Health</h3><div class="netdatacfg-card">${healthRows}</div></div>`
    : '';

  // Backend / exporting
  const backendRows = [
    row('enabled', backend['enabled']),
    row('type', backend['type']),
    row('destination', backend['destination']),
    row('prefix', backend['prefix']),
    row('update every (seconds)', backend['update every']),
  ].filter(Boolean).join('');

  const backendLabel = sections['exporting'] ? 'Exporting' : 'Backend';
  const backendHtml = hasBackend && backendRows
    ? `<div class="netdatacfg-sec"><h3>${backendLabel}</h3><div class="netdatacfg-card">${backendRows}</div></div>`
    : '';

  // Plugins chips
  let pluginsHtml = '';
  if (hasPlugins) {
    const chips = Object.entries(plugins).map(([name, val]) => {
      const enabled = val.toLowerCase() === 'yes';
      return `<span class="${enabled ? 'chip-yes' : 'chip-no'}">${esc(name)}</span>`;
    }).join('');
    pluginsHtml = `<div class="netdatacfg-sec"><h3>Plugins</h3><div class="netdatacfg-chips">${chips}</div></div>`;
  }

  const sectionCount = Object.keys(sections).length;
  const host = document.createElement('div');
  host.className = 'netdatacfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="netdatacfg-title"><span class="badge-netdata">Netdata</span>netdata.conf</div>
<div class="netdatacfg-sub">${sectionCount} section${sectionCount !== 1 ? 's' : ''}</div>
${globalHtml}
${webHtml}
${healthHtml}
${pluginsHtml}
${backendHtml}`;

  return { parentNode: host };
}
