const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gsm-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-gsm{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00acd7;color:#fff;vertical-align:middle;margin-right:8px;}
.gsm-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.gsm-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.gsm-stats{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 14px;}
.gsm-stat{display:flex;flex-direction:column;align-items:center;padding:8px 16px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);min-width:80px;}
.gsm-stat-n{font-size:22px;font-weight:700;color:var(--fg,#24292f);}
.gsm-stat-l{font-size:11px;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;}
.gsm-sec{margin:12px 0;}
.gsm-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.gsm-pills{display:flex;flex-wrap:wrap;gap:6px;}
.gsm-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.gsm-note{font-size:12px;color:var(--fg-2,#888);margin:8px 0 0;}
`;

export function render(intake) {
  const text = new TextDecoder().decode(intake.bytes);
  const lines = text.split('\n').filter((l) => l.trim());

  // Each line: `module@version hash` (or `module@version/go.mod hash`)
  const totalEntries = lines.length;
  const moduleSet = new Set();
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts[0]) {
      // Strip @version and /go.mod suffix to get module path
      const modVer = parts[0].split('/go.mod')[0];
      const atIdx = modVer.lastIndexOf('@');
      const modPath = atIdx >= 0 ? modVer.slice(0, atIdx) : modVer;
      if (modPath) moduleSet.add(modPath);
    }
  }

  const modules = [...moduleSet].sort();
  const moduleCount = modules.length;

  const SHOW = 50;
  const sampleModules = modules.slice(0, SHOW);

  const statsHtml = `<div class="gsm-stats">
    <div class="gsm-stat"><span class="gsm-stat-n">${esc(totalEntries)}</span><span class="gsm-stat-l">Entries</span></div>
    <div class="gsm-stat"><span class="gsm-stat-n">${esc(moduleCount)}</span><span class="gsm-stat-l">Modules</span></div>
  </div>`;

  const pillsHtml = sampleModules.length
    ? `<div class="gsm-sec"><h3>Modules</h3><div class="gsm-pills">${sampleModules.map((m) => `<span class="gsm-pill">${esc(m)}</span>`).join('')}</div>${moduleCount > SHOW ? `<p class="gsm-note">… and ${moduleCount - SHOW} more modules</p>` : ''}</div>`
    : '<p class="gsm-note">No entries found.</p>';

  const host = document.createElement('div');
  host.className = 'gsm-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="gsm-title"><span class="badge-gsm">Go</span>go.sum</div>
<div class="gsm-sub">${totalEntries} checksum entr${totalEntries !== 1 ? 'ies' : 'y'} · ${moduleCount} unique module${moduleCount !== 1 ? 's' : ''}</div>
${statsHtml}
${pillsHtml}`;

  return { parentNode: host };
}
