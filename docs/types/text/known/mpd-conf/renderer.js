const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.mpdcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.mpdcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a472a;color:#fff;vertical-align:middle;margin-right:8px;}
.mpdcfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.mpdcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.mpdcfg-sec{margin:12px 0;}
.mpdcfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.mpdcfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px;}
.mpdcfg-card-label{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin-bottom:6px;}
.mpdcfg-output-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:8px 12px;margin-bottom:6px;}
.mpdcfg-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.mpdcfg-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.mpdcfg-chip-red{background:#ffebee;border-color:#f44336;color:#b71c1c;}
.mpdcfg-chip-cyan{background:#e0f7fa;border-color:#00bcd4;color:#006064;}
.mpdcfg-chip-orange{background:#fff3e0;border-color:#ff9800;color:#e65100;}
.mpdcfg-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.mpdcfg-chip-purple{background:#f3e5f5;border-color:#9c27b0;color:#4a148c;}
.mpdcfg-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.mpdcfg-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.mpdcfg-key{color:var(--fg-2,#888);font-size:12px;min-width:190px;flex-shrink:0;}
.mpdcfg-val{font-family:ui-monospace,monospace;font-size:12px;}
.mpdcfg-perm-list{display:flex;flex-wrap:wrap;gap:3px;margin-top:2px;}
`;

/** Parse MPD top-level key "value" pairs (tab- or space-separated) */
function parseMpdConf(text) {
  const settings = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    // key	"value" or key "value"
    const m = line.match(/^([\w_]+)\s+"([^"]*)"/) || line.match(/^([\w_]+)\s+(\S+)/);
    if (!m) continue;
    const key = m[1].trim();
    const val = m[2].trim();
    if (!(key in settings)) settings[key] = val;
  }
  return settings;
}

/** Parse all audio_output { ... } blocks */
function parseAudioOutputs(text) {
  const outputs = [];
  const blockRe = /audio_output\s*\{([^}]*)\}/gs;
  let match;
  while ((match = blockRe.exec(text)) !== null) {
    const block = match[1];
    const out = {};
    for (const raw of block.split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const m = line.match(/^([\w_]+)\s+"([^"]*)"/) || line.match(/^([\w_]+)\s+(\S+)/);
      if (!m) continue;
      const key = m[1].trim();
      const val = m[2].trim();
      if (!(key in out)) out[key] = val;
    }
    if (out['type'] || out['name']) outputs.push(out);
  }
  return outputs;
}

function chip(val, cls = '') {
  if (!val && val !== 0) return '';
  return `<span class="mpdcfg-chip${cls ? ' mpdcfg-chip-' + cls : ''}">${esc(val)}</span>`;
}

function row(label, html) {
  if (!html) return '';
  return `<div class="mpdcfg-row"><span class="mpdcfg-key">${esc(label)}</span><span class="mpdcfg-val">${html}</span></div>`;
}

function outputTypeChip(type) {
  if (!type) return '';
  const cls = type === 'alsa' ? 'blue' : type === 'pulse' ? 'red' : type === 'pipewire' ? 'cyan' : type === 'httpd' ? 'orange' : '';
  return chip(type, cls);
}

function replaygainChip(val) {
  if (!val) return '';
  const cls = val === 'album' ? 'blue' : val === 'track' ? 'green' : val === 'auto' ? 'purple' : 'gray';
  return chip(val, cls);
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'mpdcfg-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const s = parseMpdConf(text);
  const outputs = parseAudioOutputs(text);

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:12px;">
      <span class="mpdcfg-badge">MPD</span>
      <span class="mpdcfg-title">Music Player Daemon</span>
    </div>
    <p class="mpdcfg-sub">Music Player Daemon (MPD) configuration</p>
  `;
  host.appendChild(header);

  let body = '';

  // Library card
  const libraryRows = [
    s['music_directory'] ? row('music_directory', chip(s['music_directory'])) : '',
    s['playlist_directory'] ? row('playlist_directory', chip(s['playlist_directory'])) : '',
    s['db_file'] ? row('db_file', chip(s['db_file'])) : '',
    s['state_file'] ? row('state_file', chip(s['state_file'])) : '',
    s['sticker_database'] ? row('sticker_database', chip(s['sticker_database'])) : '',
  ].filter(Boolean).join('');
  if (libraryRows) {
    body += `<div class="mpdcfg-sec">`;
    body += `<h3 style="font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;">Library</h3>`;
    body += `<div class="mpdcfg-card">${libraryRows}</div>`;
    body += `</div>`;
  }

  // Network card
  const networkRows = [
    s['bind_to_address'] ? row('bind_to_address', chip(s['bind_to_address'], 'blue')) : '',
    s['port'] ? row('port', chip(s['port'])) : '',
  ].filter(Boolean).join('');

  // Parse password line specially (may have permissions)
  const passwordMatch = text.match(/^password\s+"([^@"]+)@([^"]+)"/m);
  let passwordHtml = '';
  if (passwordMatch) {
    const perms = passwordMatch[2].split(',').map((p) => p.trim()).filter(Boolean);
    const permChips = perms.map((p) => chip(p)).join('');
    passwordHtml = row('password', `${chip('***REDACTED***', 'gray')} <span class="mpdcfg-perm-list">${permChips}</span>`);
  }

  if (networkRows || passwordHtml) {
    body += `<div class="mpdcfg-sec">`;
    body += `<h3 style="font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;">Network</h3>`;
    body += `<div class="mpdcfg-card">${networkRows}${passwordHtml}</div>`;
    body += `</div>`;
  }

  // Audio outputs card
  if (outputs.length > 0) {
    body += `<div class="mpdcfg-sec">`;
    body += `<h3 style="font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;">Audio Outputs (${outputs.length})</h3>`;
    for (const out of outputs) {
      body += `<div class="mpdcfg-output-card">`;
      body += `<div style="margin-bottom:4px;">${outputTypeChip(out['type'])} <strong style="font-size:13px;">${esc(out['name'] || '')}</strong></div>`;
      if (out['device']) body += row('device', chip(out['device']));
      if (out['format']) body += row('format', chip(out['format']));
      if (out['server']) body += row('server', chip(out['server']));
      if (out['port']) body += row('port', chip(out['port']));
      if (out['encoder']) body += row('encoder', chip(out['encoder']));
      if (out['bitrate']) body += row('bitrate', chip(out['bitrate'] + ' kbps'));
      body += `</div>`;
    }
    body += `</div>`;
  }

  // Audio settings card (replaygain, normalization, crossfade)
  const audioSettingRows = [
    s['replaygain'] ? row('replaygain', replaygainChip(s['replaygain'])) : '',
    s['volume_normalization'] ? row('volume_normalization', chip(s['volume_normalization'], s['volume_normalization'] === 'yes' ? 'green' : 'gray')) : '',
    s['crossfade'] ? row('crossfade', chip(s['crossfade'] + 's')) : '',
  ].filter(Boolean).join('');
  if (audioSettingRows) {
    body += `<div class="mpdcfg-sec">`;
    body += `<h3 style="font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;">Playback</h3>`;
    body += `<div class="mpdcfg-card">${audioSettingRows}</div>`;
    body += `</div>`;
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
