const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cmuscfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.cmuscfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1c2940;color:#fff;vertical-align:middle;margin-right:8px;}
.cmuscfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cmuscfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.cmuscfg-sec{margin:12px 0;}
.cmuscfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.cmuscfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px;}
.cmuscfg-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.cmuscfg-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.cmuscfg-chip-red{background:#ffebee;border-color:#f44336;color:#b71c1c;}
.cmuscfg-chip-cyan{background:#e0f7fa;border-color:#00bcd4;color:#006064;}
.cmuscfg-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.cmuscfg-chip-purple{background:#f3e5f5;border-color:#9c27b0;color:#4a148c;}
.cmuscfg-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.cmuscfg-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.cmuscfg-key{color:var(--fg-2,#888);font-size:12px;min-width:200px;flex-shrink:0;}
.cmuscfg-val{font-family:ui-monospace,monospace;font-size:12px;}
.cmuscfg-path-list{display:flex;flex-wrap:wrap;gap:3px;margin-top:2px;}
.cmuscfg-bind-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:6px;margin-top:4px;}
.cmuscfg-bind-item{background:var(--bg,#fff);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:4px 8px;font-size:12px;}
.cmuscfg-bind-name{font-weight:600;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;}
.cmuscfg-bind-count{font-size:13px;font-weight:700;}
`;

/** Parse cmus rc format: one command per line */
function parseCmusConf(text) {
  const settings = {};
  const binds = [];
  let colorscheme = null;

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // colorscheme <name>
    const csMatch = line.match(/^colorscheme\s+(\S+)/);
    if (csMatch) { colorscheme = csMatch[1]; continue; }

    // set key=value
    const setMatch = line.match(/^set\s+([\w_]+)=(.+)/);
    if (setMatch) {
      const key = setMatch[1].trim();
      const val = setMatch[2].trim();
      if (!(key in settings)) settings[key] = val;
      continue;
    }

    // bind -f view key command  OR  bind -k key command
    const bindMatch = line.match(/^bind\s+(.*)/);
    if (bindMatch) { binds.push(bindMatch[1].trim()); continue; }
  }

  return { settings, binds, colorscheme };
}

function chip(val, cls = '') {
  if (val == null || val === '') return '';
  return `<span class="cmuscfg-chip${cls ? ' cmuscfg-chip-' + cls : ''}">${esc(val)}</span>`;
}

function boolChip(val) {
  if (val == null) return '';
  const on = val === 'true';
  return chip(val, on ? 'green' : 'gray');
}

function row(label, html) {
  if (!html) return '';
  return `<div class="cmuscfg-row"><span class="cmuscfg-key">${esc(label)}</span><span class="cmuscfg-val">${html}</span></div>`;
}

function outputPluginChip(plugin) {
  if (!plugin) return '';
  const cls = plugin === 'alsa' ? 'blue' : plugin === 'pulse' ? 'red' : plugin === 'pipewire' ? 'cyan' : 'gray';
  return chip(plugin, cls);
}

function replaygainChip(val) {
  if (!val) return '';
  const cls = val === 'disabled' ? 'gray' : val === 'track' ? 'green' : val === 'album' ? 'blue' : val === 'auto' ? 'purple' : '';
  return chip(val, cls);
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'cmuscfg-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const { settings: s, binds, colorscheme } = parseCmusConf(text);

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:12px;">
      <span class="cmuscfg-badge">cmus</span>
      <span class="cmuscfg-title">cmus Config</span>
    </div>
    <p class="cmuscfg-sub">cmus terminal music player configuration</p>
  `;
  host.appendChild(header);

  let body = '';

  // Audio card
  const outputPlugin = s['output_plugin'];
  const dspDevice = s['dsp.alsa.device'] || s['dsp.pulse.device'] || s['dsp.pipewire.device'];
  const replaygain = s['replaygain'];
  const replaygainPreamp = s['replaygain_preamp'];
  const volLeft = s['vol_left'];
  const volRight = s['vol_right'];

  const audioRows = [
    outputPlugin ? row('output_plugin', outputPluginChip(outputPlugin)) : '',
    dspDevice ? row('dsp device', chip(dspDevice)) : '',
    replaygain ? row('replaygain', replaygainChip(replaygain)) : '',
    replaygainPreamp != null ? row('replaygain_preamp', chip(replaygainPreamp)) : '',
    volLeft != null ? row('vol_left', chip(volLeft)) : '',
    volRight != null ? row('vol_right', chip(volRight)) : '',
  ].filter(Boolean).join('');

  if (audioRows) {
    body += `<div class="cmuscfg-sec"><h3>Audio</h3><div class="cmuscfg-card">${audioRows}</div></div>`;
  }

  // Display/UI card
  const displayRows = [
    colorscheme ? row('colorscheme', chip(colorscheme)) : '',
    s['show_hidden'] != null ? row('show_hidden', boolChip(s['show_hidden'])) : '',
    s['show_playlistwin_artist'] != null ? row('show_playlistwin_artist', boolChip(s['show_playlistwin_artist'])) : '',
    s['show_remaining_time'] != null ? row('show_remaining_time', boolChip(s['show_remaining_time'])) : '',
    s['play_sorted'] != null ? row('play_sorted', boolChip(s['play_sorted'])) : '',
    s['continue'] != null ? row('continue', boolChip(s['continue'])) : '',
    s['shuffle'] != null ? row('shuffle', boolChip(s['shuffle'])) : '',
    s['repeat'] != null ? row('repeat', boolChip(s['repeat'])) : '',
    s['repeat_current'] != null ? row('repeat_current', boolChip(s['repeat_current'])) : '',
    s['aaa_mode'] ? row('aaa_mode', chip(s['aaa_mode'])) : '',
  ].filter(Boolean).join('');

  if (displayRows) {
    body += `<div class="cmuscfg-sec"><h3>Display &amp; Playback</h3><div class="cmuscfg-card">${displayRows}</div></div>`;
  }

  // Library settings card
  const libPaths = s['lib_path'] ? s['lib_path'].split(':').filter(Boolean) : [];
  const filenameFormat = s['filename_format'];
  const sort = s['sort'];

  const libRows = [
    libPaths.length ? row('lib_path', `<span class="cmuscfg-path-list">${libPaths.map((p) => chip(p)).join('')}</span>`) : '',
    filenameFormat ? row('filename_format', chip(filenameFormat)) : '',
    sort ? row('sort', chip(sort)) : '',
  ].filter(Boolean).join('');

  if (libRows) {
    body += `<div class="cmuscfg-sec"><h3>Library</h3><div class="cmuscfg-card">${libRows}</div></div>`;
  }

  // Key bindings
  if (binds.length > 0) {
    // Group by view: -f <view> = named view, -k = common
    const groups = {};
    for (const b of binds) {
      const viewMatch = b.match(/^-f\s+(\S+)/);
      const commonMatch = b.match(/^-k\s+/);
      const key = viewMatch ? viewMatch[1] : (commonMatch ? 'common' : 'other');
      groups[key] = (groups[key] || 0) + 1;
    }
    const totalBinds = binds.length;
    const gridItems = Object.entries(groups).map(([view, count]) =>
      `<div class="cmuscfg-bind-item"><div class="cmuscfg-bind-name">${esc(view)}</div><div class="cmuscfg-bind-count">${count}</div></div>`
    ).join('');

    body += `<div class="cmuscfg-sec"><h3>Key Bindings (${totalBinds} total)</h3>`;
    body += `<div class="cmuscfg-card"><div class="cmuscfg-bind-grid">${gridItems}</div></div>`;
    body += `</div>`;
  }

  // Colors summary
  const colorKeys = Object.keys(s).filter((k) => k.startsWith('color_'));
  if (colorKeys.length > 0 || colorscheme) {
    const colorRows = [
      colorscheme ? row('colorscheme', chip(colorscheme)) : '',
      colorKeys.length ? row('color_* settings', chip(String(colorKeys.length) + ' defined')) : '',
    ].filter(Boolean).join('');
    body += `<div class="cmuscfg-sec"><h3>Colors</h3><div class="cmuscfg-card">${colorRows}</div></div>`;
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
