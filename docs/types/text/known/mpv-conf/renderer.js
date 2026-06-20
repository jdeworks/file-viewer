// mpv media player config renderer.
// Parses key=value directives, profile sections [profile-name], and # comments.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.mpvcfg-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.mpvcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a1a1a;color:#fff;vertical-align:middle;margin-right:8px}
.mpvcfg-title{font-size:18px;font-weight:700;margin:0 0 4px}
.mpvcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.mpvcfg-sec{margin:14px 0}
.mpvcfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;border-bottom:1px solid var(--border,#e0e0e0);padding-bottom:4px}
.mpvcfg-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.mpvcfg-chip{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.mpvcfg-chip-green{background:#dcfce7;border-color:#86efac;color:#15803d}
.mpvcfg-chip-blue{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}
.mpvcfg-chip-cyan{background:#ecfeff;border-color:#a5f3fc;color:#0e7490}
.mpvcfg-chip-gray{background:#f3f4f6;border-color:#d1d5db;color:#4b5563}
.mpvcfg-chip-red{background:#fef2f2;border-color:#fca5a5;color:#dc2626}
.mpvcfg-table{width:100%;border-collapse:collapse;font-size:13px}
.mpvcfg-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.mpvcfg-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top}
.mpvcfg-key{font:13px/1.4 ui-monospace,monospace;font-weight:600}
.mpvcfg-val{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#666)}
.mpvcfg-swatch{display:inline-block;width:14px;height:14px;border-radius:3px;vertical-align:middle;margin-right:5px;border:1px solid #aaa}
`;

function parseMpv(text) {
  const lines = text.split('\n');
  const data = {
    vo: null,
    hwdec: null,
    videoSync: null,
    gpuContext: null,
    scale: null,
    cscale: null,
    dscale: null,
    ao: null,
    audioChannels: null,
    volume: null,
    audioDelay: null,
    subFont: null,
    subFontSize: null,
    subColor: null,
    subBorderSize: null,
    subAuto: null,
    cache: null,
    demuxerMaxBytes: null,
    profiles: [],
  };

  let currentProfile = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // Profile section header [profile-name]
    const profileMatch = line.match(/^\[([^\]]+)\]$/);
    if (profileMatch) {
      currentProfile = profileMatch[1];
      if (!data.profiles.includes(currentProfile)) data.profiles.push(currentProfile);
      continue;
    }

    // key=value or key = value
    const kvMatch = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*(.*)$/);
    if (!kvMatch) continue;
    const key = kvMatch[1].toLowerCase();
    const val = kvMatch[2].trim();

    // Only parse top-level (non-profile) directives for the main data fields
    // Profile keys still get parsed if they're in the top section
    switch (key) {
      case 'vo':
      case 'video-output': if (!data.vo) data.vo = val; break;
      case 'hwdec': if (!data.hwdec) data.hwdec = val; break;
      case 'video-sync': if (!data.videoSync) data.videoSync = val; break;
      case 'gpu-context': if (!data.gpuContext) data.gpuContext = val; break;
      case 'scale': if (!data.scale) data.scale = val; break;
      case 'cscale': if (!data.cscale) data.cscale = val; break;
      case 'dscale': if (!data.dscale) data.dscale = val; break;
      case 'ao': if (!data.ao) data.ao = val; break;
      case 'audio-channels': if (!data.audioChannels) data.audioChannels = val; break;
      case 'volume': if (!data.volume) data.volume = val; break;
      case 'audio-delay': if (!data.audioDelay) data.audioDelay = val; break;
      case 'sub-font': if (!data.subFont) data.subFont = val; break;
      case 'sub-font-size': if (!data.subFontSize) data.subFontSize = val; break;
      case 'sub-color': if (!data.subColor) data.subColor = val; break;
      case 'sub-border-size': if (!data.subBorderSize) data.subBorderSize = val; break;
      case 'sub-auto': if (!data.subAuto) data.subAuto = val; break;
      case 'cache': if (!data.cache) data.cache = val; break;
      case 'demuxer-max-bytes': if (!data.demuxerMaxBytes) data.demuxerMaxBytes = val; break;
    }
  }

  return data;
}

function voChip(vo) {
  if (!vo) return '';
  const cls = vo === 'gpu' ? 'mpvcfg-chip-green' : vo === 'gpu-next' ? 'mpvcfg-chip-blue' : 'mpvcfg-chip-gray';
  return `<span class="mpvcfg-chip ${cls}">${esc(vo)}</span>`;
}

function hwdecChip(hwdec) {
  if (!hwdec) return '';
  const map = { 'auto-safe': 'mpvcfg-chip-green', 'nvdec': 'mpvcfg-chip-cyan', 'vaapi': 'mpvcfg-chip-blue', 'no': 'mpvcfg-chip-gray' };
  const cls = map[hwdec] || 'mpvcfg-chip-gray';
  return `<span class="mpvcfg-chip ${cls}">${esc(hwdec)}</span>`;
}

function aoChip(ao) {
  if (!ao) return '';
  const map = { 'pipewire': 'mpvcfg-chip-cyan', 'pulse': 'mpvcfg-chip-red', 'alsa': 'mpvcfg-chip-blue' };
  const cls = map[ao] || 'mpvcfg-chip-gray';
  return `<span class="mpvcfg-chip ${cls}">${esc(ao)}</span>`;
}

function mpvColorToCSS(color) {
  // mpv uses #RRGGBBAA or #RRGGBB hex
  if (!color) return null;
  if (/^#[0-9a-fA-F]{8}$/.test(color)) {
    // RRGGBBAA → css rgba
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const a = parseInt(color.slice(7, 9), 16) / 255;
    return `rgba(${r},${g},${b},${a.toFixed(2)})`;
  }
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  return null;
}

export function render(intake) {
  const text = intake.text || '';
  const d = parseMpv(text);

  const parts = [];

  // Video card
  const videoRows = [];
  if (d.vo) videoRows.push(`<tr><td class="mpvcfg-key">vo</td><td>${voChip(d.vo)}</td></tr>`);
  if (d.hwdec) videoRows.push(`<tr><td class="mpvcfg-key">hwdec</td><td>${hwdecChip(d.hwdec)}</td></tr>`);
  if (d.videoSync) videoRows.push(`<tr><td class="mpvcfg-key">video-sync</td><td><span class="mpvcfg-val">${esc(d.videoSync)}</span></td></tr>`);
  if (d.gpuContext) videoRows.push(`<tr><td class="mpvcfg-key">gpu-context</td><td><span class="mpvcfg-chip mpvcfg-chip-gray">${esc(d.gpuContext)}</span></td></tr>`);
  if (d.scale) videoRows.push(`<tr><td class="mpvcfg-key">scale</td><td><span class="mpvcfg-val">${esc(d.scale)}</span></td></tr>`);
  if (d.cscale) videoRows.push(`<tr><td class="mpvcfg-key">cscale</td><td><span class="mpvcfg-val">${esc(d.cscale)}</span></td></tr>`);
  if (d.dscale) videoRows.push(`<tr><td class="mpvcfg-key">dscale</td><td><span class="mpvcfg-val">${esc(d.dscale)}</span></td></tr>`);
  if (videoRows.length) {
    parts.push(`<div class="mpvcfg-sec"><h3>Video</h3><table class="mpvcfg-table"><tbody>${videoRows.join('')}</tbody></table></div>`);
  }

  // Audio card
  const audioRows = [];
  if (d.ao) audioRows.push(`<tr><td class="mpvcfg-key">ao</td><td>${aoChip(d.ao)}</td></tr>`);
  if (d.audioChannels) audioRows.push(`<tr><td class="mpvcfg-key">audio-channels</td><td><span class="mpvcfg-val">${esc(d.audioChannels)}</span></td></tr>`);
  if (d.volume) audioRows.push(`<tr><td class="mpvcfg-key">volume</td><td><span class="mpvcfg-val">${esc(d.volume)}</span></td></tr>`);
  if (d.audioDelay) audioRows.push(`<tr><td class="mpvcfg-key">audio-delay</td><td><span class="mpvcfg-val">${esc(d.audioDelay)}</span></td></tr>`);
  if (audioRows.length) {
    parts.push(`<div class="mpvcfg-sec"><h3>Audio</h3><table class="mpvcfg-table"><tbody>${audioRows.join('')}</tbody></table></div>`);
  }

  // Subtitles card
  const subRows = [];
  if (d.subFont) subRows.push(`<tr><td class="mpvcfg-key">sub-font</td><td><span class="mpvcfg-val">${esc(d.subFont)}</span></td></tr>`);
  if (d.subFontSize) subRows.push(`<tr><td class="mpvcfg-key">sub-font-size</td><td><span class="mpvcfg-val">${esc(d.subFontSize)}</span></td></tr>`);
  if (d.subColor) {
    const cssColor = mpvColorToCSS(d.subColor);
    const swatch = cssColor ? `<span class="mpvcfg-swatch" style="background:${esc(cssColor)}"></span>` : '';
    subRows.push(`<tr><td class="mpvcfg-key">sub-color</td><td>${swatch}<span class="mpvcfg-val">${esc(d.subColor)}</span></td></tr>`);
  }
  if (d.subBorderSize) subRows.push(`<tr><td class="mpvcfg-key">sub-border-size</td><td><span class="mpvcfg-val">${esc(d.subBorderSize)}</span></td></tr>`);
  if (d.subAuto) subRows.push(`<tr><td class="mpvcfg-key">sub-auto</td><td><span class="mpvcfg-chip mpvcfg-chip-gray">${esc(d.subAuto)}</span></td></tr>`);
  if (subRows.length) {
    parts.push(`<div class="mpvcfg-sec"><h3>Subtitles</h3><table class="mpvcfg-table"><tbody>${subRows.join('')}</tbody></table></div>`);
  }

  // Profiles
  if (d.profiles.length) {
    const chips = d.profiles.map((p) => `<span class="mpvcfg-chip">${esc(p)}</span>`).join('');
    parts.push(`<div class="mpvcfg-sec"><h3>Profiles (${d.profiles.length})</h3><div class="mpvcfg-chips">${chips}</div></div>`);
  }

  // Cache card
  const cacheRows = [];
  if (d.cache) {
    const cls = d.cache === 'yes' ? 'mpvcfg-chip-green' : 'mpvcfg-chip-gray';
    cacheRows.push(`<tr><td class="mpvcfg-key">cache</td><td><span class="mpvcfg-chip ${cls}">${esc(d.cache)}</span></td></tr>`);
  }
  if (d.demuxerMaxBytes) cacheRows.push(`<tr><td class="mpvcfg-key">demuxer-max-bytes</td><td><span class="mpvcfg-val">${esc(d.demuxerMaxBytes)}</span></td></tr>`);
  if (cacheRows.length) {
    parts.push(`<div class="mpvcfg-sec"><h3>Cache</h3><table class="mpvcfg-table"><tbody>${cacheRows.join('')}</tbody></table></div>`);
  }

  const sub = [
    d.vo ? `vo=${d.vo}` : null,
    d.ao ? `ao=${d.ao}` : null,
    d.profiles.length ? `${d.profiles.length} profile${d.profiles.length !== 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(' · ') || 'mpv configuration';

  const host = document.createElement('div');
  host.className = 'mpvcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="mpvcfg-title"><span class="mpvcfg-badge">mpv</span>mpv Config</div>
<div class="mpvcfg-sub">${esc(sub)}</div>
${parts.join('')}`;

  return { parentNode: host };
}
