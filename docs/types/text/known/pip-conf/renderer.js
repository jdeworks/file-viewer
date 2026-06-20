// pip.conf / pip.ini renderer: parses INI sections and shows index, trusted-host, and other settings.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ext = (href, text) => `<a class="pc-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(text)} <span class="pc-ext">↗</span></a>`;

const CSS = `
.pc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-pc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3572a5;color:#fff;vertical-align:middle;margin-right:8px;}
.pc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.pc-sec{margin:14px 0 8px;}
.pc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;font-weight:600;}
.pc-table{width:100%;border-collapse:collapse;font-size:13px;}
.pc-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.pc-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.pc-key{font-weight:600;font:13px/1.4 ui-monospace,monospace;color:var(--fg,#24292f);}
.pc-val{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#555);}
.pc-chip{display:inline-block;padding:1px 8px;border-radius:8px;font-size:11px;font-weight:600;background:#fff3e0;border:1px solid #ffcc80;color:#e65100;margin-right:4px;}
.pc-chip.trusted{background:#fce4ec;border-color:#f48fb1;color:#880e4f;}
.pc-chip.section{background:#e3f2fd;border-color:#90caf9;color:#0d47a1;font-family:ui-monospace,monospace;}
.pc-link{color:#0969da;text-decoration:none;}
.pc-link:hover{text-decoration:underline;}
.pc-ext{font-size:10px;opacity:.6;}
.pc-empty{font-size:13px;color:var(--fg-2,#888);}
`;

function parseIni(text) {
  const sections = {};
  let cur = '__global__';
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const sec = /^\[(.+)\]$/.exec(line);
    if (sec) { cur = sec[1].trim(); sections[cur] = sections[cur] || {}; continue; }
    const kv = /^([^=]+)=(.*)/.exec(line);
    if (kv) {
      const k = kv[1].trim();
      const v = kv[2].trim();
      sections[cur] = sections[cur] || {};
      // multi-value keys (continuation lines handled by joining)
      if (sections[cur][k]) {
        sections[cur][k] += '\n' + v;
      } else {
        sections[cur][k] = v;
      }
    }
  }
  return sections;
}

function isUrl(s) { return /^https?:\/\//.test(s); }

export function render(intake) {
  const filename = (intake.name || intake.filename || 'pip.conf').split('/').pop();
  const sections = parseIni(intake.text || '');

  // Flatten all sections' keys for display, highlighting important ones
  const allSections = Object.keys(sections).filter((s) => s !== '__global__');
  const global = sections['__global__'] || {};

  // Gather settings from [global] or [install] sections
  const globalSec = sections['global'] || {};
  const installSec = sections['install'] || {};
  const merged = { ...globalSec, ...installSec, ...global };

  const indexUrl = merged['index-url'] || merged['index_url'] || null;
  const extraUrls = (merged['extra-index-url'] || merged['extra_index_url'] || '').split(/\s+/).filter(Boolean);
  const trustedHosts = (merged['trusted-host'] || merged['trusted_host'] || '').split(/\s+/).filter(Boolean);
  const timeout = merged['timeout'] || null;
  const findLinks = merged['find-links'] || merged['find_links'] || null;

  // All other keys
  const knownKeys = new Set(['index-url', 'index_url', 'extra-index-url', 'extra_index_url', 'trusted-host', 'trusted_host', 'timeout', 'find-links', 'find_links']);
  const otherSettings = Object.entries(merged).filter(([k]) => !knownKeys.has(k));

  const sectionChips = allSections.map((s) => `<span class="pc-chip section">[${esc(s)}]</span>`).join('');

  const host = document.createElement('div');
  host.className = 'pc-doc';

  let html = `<style>${CSS}</style>
<div class="pc-title"><span class="badge-pc">pip</span>${esc(filename)}</div>
<div class="pc-sub">pip package manager configuration${allSections.length ? ' · sections: ' + sectionChips : ''}</div>`;

  // Index section
  if (indexUrl || extraUrls.length) {
    html += `<div class="pc-sec"><h3>Package Index</h3><table class="pc-table"><thead><tr><th>Key</th><th>URL</th></tr></thead><tbody>`;
    if (indexUrl) {
      html += `<tr><td class="pc-key">index-url</td><td class="pc-val">${isUrl(indexUrl) ? ext(indexUrl, indexUrl) : esc(indexUrl)}</td></tr>`;
    }
    for (const u of extraUrls) {
      html += `<tr><td class="pc-key">extra-index-url</td><td class="pc-val">${isUrl(u) ? ext(u, u) : esc(u)}</td></tr>`;
    }
    html += `</tbody></table></div>`;
  }

  if (trustedHosts.length) {
    html += `<div class="pc-sec"><h3>Trusted Hosts</h3><div style="display:flex;flex-wrap:wrap;gap:6px;margin:4px 0">`;
    html += trustedHosts.map((h) => `<span class="pc-chip trusted">${esc(h)}</span>`).join('');
    html += `</div></div>`;
  }

  if (findLinks || timeout || otherSettings.length) {
    html += `<div class="pc-sec"><h3>Other Settings</h3><table class="pc-table"><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>`;
    if (timeout) html += `<tr><td class="pc-key">timeout</td><td class="pc-val">${esc(timeout)}s</td></tr>`;
    if (findLinks) html += `<tr><td class="pc-key">find-links</td><td class="pc-val">${esc(findLinks)}</td></tr>`;
    for (const [k, v] of otherSettings) {
      html += `<tr><td class="pc-key">${esc(k)}</td><td class="pc-val">${esc(v)}</td></tr>`;
    }
    html += `</tbody></table></div>`;
  }

  if (!indexUrl && !extraUrls.length && !trustedHosts.length && !findLinks && !timeout && !otherSettings.length) {
    html += `<div class="pc-empty">No configuration entries found.</div>`;
  }

  host.innerHTML = html;
  return { parentNode: host };
}
