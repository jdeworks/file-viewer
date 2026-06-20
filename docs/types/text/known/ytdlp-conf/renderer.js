// yt-dlp / youtube-dl config renderer.
// Parses --flag value lines and boolean --flag lines. Masks credentials.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ytdlpcfg-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.ytdlpcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#cc0000;color:#fff;vertical-align:middle;margin-right:8px}
.ytdlpcfg-title{font-size:18px;font-weight:700;margin:0 0 4px}
.ytdlpcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.ytdlpcfg-sec{margin:14px 0}
.ytdlpcfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;border-bottom:1px solid var(--border,#e0e0e0);padding-bottom:4px}
.ytdlpcfg-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.ytdlpcfg-chip{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.ytdlpcfg-chip-green{background:#dcfce7;border-color:#86efac;color:#15803d}
.ytdlpcfg-chip-blue{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}
.ytdlpcfg-chip-gray{background:#f3f4f6;border-color:#d1d5db;color:#4b5563}
.ytdlpcfg-table{width:100%;border-collapse:collapse;font-size:13px}
.ytdlpcfg-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.ytdlpcfg-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top}
.ytdlpcfg-key{font:13px/1.4 ui-monospace,monospace;font-weight:600}
.ytdlpcfg-val{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#666);word-break:break-all}
.ytdlpcfg-trunc{display:inline-block;max-width:500px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:bottom;font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#666)}
`;

function parseYtdlp(text) {
  const lines = text.split('\n');
  const flags = new Map();
  const boolFlags = new Set();

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // --flag value  OR  -f value  (short form)
    const flagVal = line.match(/^(--[\w-]+|-[a-zA-Z])\s+(.+)$/);
    if (flagVal) {
      const flag = flagVal[1].replace(/^-+/, '');
      const val = flagVal[2].trim();
      if (!flags.has(flag)) flags.set(flag, val);
      continue;
    }

    // --flag (boolean / standalone)
    const boolFlag = line.match(/^(--[\w-]+)$/);
    if (boolFlag) {
      const flag = boolFlag[1].replace(/^-+/, '');
      boolFlags.add(flag);
      continue;
    }
  }

  return { flags, boolFlags };
}

function mergeOutputChip(fmt) {
  if (!fmt) return '';
  const cls = fmt === 'mp4' ? 'ytdlpcfg-chip-green' : fmt === 'mkv' ? 'ytdlpcfg-chip-blue' : 'ytdlpcfg-chip-gray';
  return `<span class="ytdlpcfg-chip ${cls}">${esc(fmt)}</span>`;
}

function boolChip(label) {
  return `<span class="ytdlpcfg-chip ytdlpcfg-chip-green">${esc(label)}</span>`;
}

export function render(intake) {
  const text = intake.text || '';
  const { flags, boolFlags } = parseYtdlp(text);

  const parts = [];

  // Format card
  const formatRows = [];
  const fmt = flags.get('format') || flags.get('f');
  if (fmt) {
    const display = fmt.length > 60 ? fmt.slice(0, 57) + '…' : fmt;
    formatRows.push(`<tr><td class="ytdlpcfg-key">format</td><td><span class="ytdlpcfg-chip ytdlpcfg-chip-gray" title="${esc(fmt)}">${esc(display)}</span></td></tr>`);
  }
  const mof = flags.get('merge-output-format');
  if (mof) formatRows.push(`<tr><td class="ytdlpcfg-key">merge-output-format</td><td>${mergeOutputChip(mof)}</td></tr>`);
  const af = flags.get('audio-format');
  if (af) formatRows.push(`<tr><td class="ytdlpcfg-key">audio-format</td><td><span class="ytdlpcfg-chip ytdlpcfg-chip-gray">${esc(af)}</span></td></tr>`);
  const aq = flags.get('audio-quality');
  if (aq) formatRows.push(`<tr><td class="ytdlpcfg-key">audio-quality</td><td><span class="ytdlpcfg-val">${esc(aq)}</span></td></tr>`);
  if (formatRows.length) {
    parts.push(`<div class="ytdlpcfg-sec"><h3>Format</h3><table class="ytdlpcfg-table"><tbody>${formatRows.join('')}</tbody></table></div>`);
  }

  // Output card
  const outputRows = [];
  const out = flags.get('output') || flags.get('o');
  if (out) outputRows.push(`<tr><td class="ytdlpcfg-key">output</td><td><span class="ytdlpcfg-trunc" title="${esc(out)}">${esc(out)}</span></td></tr>`);
  const paths = flags.get('paths');
  if (paths) outputRows.push(`<tr><td class="ytdlpcfg-key">paths</td><td><span class="ytdlpcfg-val">${esc(paths)}</span></td></tr>`);
  const restrict = boolFlags.has('restrict-filenames');
  if (restrict) outputRows.push(`<tr><td class="ytdlpcfg-key">restrict-filenames</td><td><span class="ytdlpcfg-chip ytdlpcfg-chip-green">yes</span></td></tr>`);
  if (outputRows.length) {
    parts.push(`<div class="ytdlpcfg-sec"><h3>Output</h3><table class="ytdlpcfg-table"><tbody>${outputRows.join('')}</tbody></table></div>`);
  }

  // Metadata / post-processing chips
  const metaFeatures = [
    ['embed-thumbnail', 'embed-thumbnail'],
    ['embed-subs', 'embed-subs'],
    ['embed-metadata', 'embed-metadata'],
    ['embed-chapters', 'embed-chapters'],
    ['add-metadata', 'add-metadata'],
    ['write-subs', 'write-subs'],
    ['write-auto-subs', 'write-auto-subs'],
  ].filter(([flag]) => boolFlags.has(flag));
  const subLangs = flags.get('sub-langs');
  const metaChips = metaFeatures.map(([, label]) => boolChip(label));
  if (subLangs) metaChips.push(`<span class="ytdlpcfg-chip ytdlpcfg-chip-blue">sub-langs: ${esc(subLangs)}</span>`);
  if (metaChips.length) {
    parts.push(`<div class="ytdlpcfg-sec"><h3>Metadata &amp; Post-processing</h3><div class="ytdlpcfg-chips">${metaChips.join('')}</div></div>`);
  }

  // Network card
  const netRows = [];
  const rateLimit = flags.get('rate-limit');
  if (rateLimit) netRows.push(`<tr><td class="ytdlpcfg-key">rate-limit</td><td><span class="ytdlpcfg-val">${esc(rateLimit)}</span></td></tr>`);
  const concurrentFrags = flags.get('concurrent-fragments');
  if (concurrentFrags) netRows.push(`<tr><td class="ytdlpcfg-key">concurrent-fragments</td><td><span class="ytdlpcfg-val">${esc(concurrentFrags)}</span></td></tr>`);
  const proxy = flags.get('proxy');
  if (proxy) {
    // Mask any credentials in proxy URL
    const maskedProxy = proxy.replace(/:\/\/([^@]+)@/, '://[credentials]@');
    netRows.push(`<tr><td class="ytdlpcfg-key">proxy</td><td><span class="ytdlpcfg-val">${esc(maskedProxy)}</span></td></tr>`);
  }
  const cookiesBrowser = flags.get('cookies-from-browser');
  if (cookiesBrowser) netRows.push(`<tr><td class="ytdlpcfg-key">cookies-from-browser</td><td><span class="ytdlpcfg-chip ytdlpcfg-chip-gray">${esc(cookiesBrowser)}</span></td></tr>`);
  if (netRows.length) {
    parts.push(`<div class="ytdlpcfg-sec"><h3>Network</h3><table class="ytdlpcfg-table"><tbody>${netRows.join('')}</tbody></table></div>`);
  }

  // Auth card
  const authRows = [];
  if (flags.has('username')) authRows.push(`<tr><td class="ytdlpcfg-key">username</td><td><span class="ytdlpcfg-val">[configured]</span></td></tr>`);
  if (flags.has('password')) authRows.push(`<tr><td class="ytdlpcfg-key">password</td><td><span class="ytdlpcfg-val">[configured]</span></td></tr>`);
  if (boolFlags.has('netrc')) authRows.push(`<tr><td class="ytdlpcfg-key">netrc</td><td><span class="ytdlpcfg-chip ytdlpcfg-chip-gray">yes</span></td></tr>`);
  if (authRows.length) {
    parts.push(`<div class="ytdlpcfg-sec"><h3>Authentication</h3><table class="ytdlpcfg-table"><tbody>${authRows.join('')}</tbody></table></div>`);
  }

  const subParts = [];
  if (fmt) subParts.push('format configured');
  if (mof) subParts.push(`→ ${mof}`);
  if (metaFeatures.length) subParts.push(`${metaFeatures.length} post-processing option${metaFeatures.length !== 1 ? 's' : ''}`);
  const sub = subParts.join(' · ') || 'yt-dlp configuration';

  const host = document.createElement('div');
  host.className = 'ytdlpcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="ytdlpcfg-title"><span class="ytdlpcfg-badge">yt-dlp</span>yt-dlp Config</div>
<div class="ytdlpcfg-sub">${esc(sub)}</div>
${parts.join('')}`;

  return { parentNode: host };
}
