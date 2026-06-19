const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.lst-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-lst{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#a855f7;color:#fff;vertical-align:middle;margin-right:8px;}
.lst-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.lst-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.lst-sec{margin:12px 0;}
.lst-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.lst-entry{padding:6px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.lst-entry:last-child{border-bottom:none;}
.lst-glob{font:12px ui-monospace,monospace;color:var(--accent,#0969da);font-weight:600;margin-bottom:4px;}
.lst-cmds{padding-left:12px;}
.lst-cmd{font:12px ui-monospace,monospace;color:var(--fg,#24292f);padding:1px 0;}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const entries = typeof cfg === 'object' && !Array.isArray(cfg) ? Object.entries(cfg) : [];

  let entriesHtml = '';
  if (entries.length) {
    entriesHtml = '<div class="lst-sec"><h3>Glob rules</h3>';
    for (const [glob, cmds] of entries.slice(0, 10)) {
      const cmdList = Array.isArray(cmds) ? cmds : [cmds];
      entriesHtml += `<div class="lst-entry"><div class="lst-glob">${esc(glob)}</div><div class="lst-cmds">`;
      for (const c of cmdList) entriesHtml += `<div class="lst-cmd">&#9658; ${esc(c)}</div>`;
      entriesHtml += '</div></div>';
    }
    entriesHtml += '</div>';
  }

  const host = document.createElement('div');
  host.className = 'lst-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="lst-title"><span class="badge-lst">lint-staged</span>.lintstagedrc.json</div>
<div class="lst-sub">${entries.length ? `${entries.length} glob rule${entries.length !== 1 ? 's' : ''}` : 'Run linters on staged files'}</div>
${entriesHtml}`;
  return { parentNode: host };
}
