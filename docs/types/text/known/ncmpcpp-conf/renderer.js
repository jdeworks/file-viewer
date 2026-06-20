const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ncmpcpp-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ncmpcpp-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2d1b69;color:#fff;vertical-align:middle;margin-right:8px;}
.ncmpcpp-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ncmpcpp-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ncmpcpp-sec{margin:12px 0;}
.ncmpcpp-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.ncmpcpp-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px;}
.ncmpcpp-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.ncmpcpp-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.ncmpcpp-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.ncmpcpp-chip-purple{background:#f3e5f5;border-color:#9c27b0;color:#4a148c;}
.ncmpcpp-chip-teal{background:#e0f2f1;border-color:#009688;color:#004d40;}
.ncmpcpp-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.ncmpcpp-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.ncmpcpp-key{color:var(--fg-2,#888);font-size:12px;min-width:210px;flex-shrink:0;}
.ncmpcpp-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
`;

/** Parse ncmpcpp config: key = value pairs */
function parseNcmpcppConf(text) {
  const settings = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([\w_-]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    const val = m[2].trim();
    if (!(key in settings)) settings[key] = val;
  }
  return settings;
}

function chip(val, cls = '') {
  if (val == null || val === '') return '';
  return `<span class="ncmpcpp-chip${cls ? ' ncmpcpp-chip-' + cls : ''}">${esc(val)}</span>`;
}

function row(label, html) {
  if (!html) return '';
  return `<div class="ncmpcpp-row"><span class="ncmpcpp-key">${esc(label)}</span><span class="ncmpcpp-val">${html}</span></div>`;
}

function yesNoChip(val) {
  if (!val) return '';
  return chip(val, val === 'yes' ? 'green' : 'gray');
}

function visualizerTypeChip(val) {
  if (!val) return '';
  const cls = val === 'spectrum' ? 'purple' : val === 'wave' ? 'blue' : val === 'wave_filled' ? 'teal' : val === 'ellipse' ? 'green' : '';
  return chip(val, cls);
}

function mediaLibTagChip(val) {
  if (!val) return '';
  const cls = val === 'album_artist' ? 'green' : val === 'artist' ? 'blue' : '';
  return chip(val, cls);
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'ncmpcpp-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const s = parseNcmpcppConf(text);

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:12px;">
      <span class="ncmpcpp-badge">ncmpcpp</span>
      <span class="ncmpcpp-title">ncmpcpp Config</span>
    </div>
    <p class="ncmpcpp-sub">ncmpcpp MPD music player client configuration</p>
  `;
  host.appendChild(header);

  let body = '';

  // MPD Connection card
  const mpdRows = [
    s['mpd_host'] ? row('mpd_host', chip(s['mpd_host'], 'blue')) : '',
    s['mpd_port'] ? row('mpd_port', chip(s['mpd_port'])) : '',
    s['mpd_connection_timeout'] ? row('mpd_connection_timeout', chip(s['mpd_connection_timeout'])) : '',
    s['mpd_music_dir'] ? row('mpd_music_dir', chip(s['mpd_music_dir'])) : '',
  ].filter(Boolean).join('');
  if (mpdRows) {
    body += `<div class="ncmpcpp-sec"><h3>MPD Connection</h3><div class="ncmpcpp-card">${mpdRows}</div></div>`;
  }

  // Display card
  const displayRows = [
    s['ncmpcpp_directory'] ? row('ncmpcpp_directory', chip(s['ncmpcpp_directory'])) : '',
    s['song_list_format'] ? row('song_list_format', chip(s['song_list_format'])) : '',
    s['song_status_format'] ? row('song_status_format', chip(s['song_status_format'])) : '',
    s['colors_enabled'] ? row('colors_enabled', yesNoChip(s['colors_enabled'])) : '',
    s['playlist_show_remaining_time'] ? row('playlist_show_remaining_time', yesNoChip(s['playlist_show_remaining_time'])) : '',
    s['clock_display_seconds'] ? row('clock_display_seconds', yesNoChip(s['clock_display_seconds'])) : '',
  ].filter(Boolean).join('');
  if (displayRows) {
    body += `<div class="ncmpcpp-sec"><h3>Display</h3><div class="ncmpcpp-card">${displayRows}</div></div>`;
  }

  // Lyrics card
  const lyricsRows = [
    s['lyrics_directory'] ? row('lyrics_directory', chip(s['lyrics_directory'])) : '',
    s['store_lyrics_in_song_dir'] ? row('store_lyrics_in_song_dir', yesNoChip(s['store_lyrics_in_song_dir'])) : '',
  ].filter(Boolean).join('');
  if (lyricsRows) {
    body += `<div class="ncmpcpp-sec"><h3>Lyrics</h3><div class="ncmpcpp-card">${lyricsRows}</div></div>`;
  }

  // Visualizer card (only if configured)
  const visualizerRows = [
    s['visualizer_data_source'] ? row('visualizer_data_source', chip(s['visualizer_data_source'])) : '',
    s['visualizer_output_name'] ? row('visualizer_output_name', chip(s['visualizer_output_name'])) : '',
    s['visualizer_type'] ? row('visualizer_type', visualizerTypeChip(s['visualizer_type'])) : '',
    s['visualizer_color'] ? row('visualizer_color', chip(s['visualizer_color'])) : '',
  ].filter(Boolean).join('');
  if (visualizerRows) {
    body += `<div class="ncmpcpp-sec"><h3>Visualizer</h3><div class="ncmpcpp-card">${visualizerRows}</div></div>`;
  }

  // Media Library card
  const mediaRows = [
    s['media_library_primary_tag'] ? row('media_library_primary_tag', mediaLibTagChip(s['media_library_primary_tag'])) : '',
  ].filter(Boolean).join('');
  if (mediaRows) {
    body += `<div class="ncmpcpp-sec"><h3>Media Library</h3><div class="ncmpcpp-card">${mediaRows}</div></div>`;
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
