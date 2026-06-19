const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.hsk-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-hsk{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#42b883;color:#fff;vertical-align:middle;margin-right:8px;}
.hsk-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.hsk-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.hsk-sec{margin:12px 0;}
.hsk-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.hsk-hook{display:grid;grid-template-columns:max-content 1fr;gap:4px 12px;padding:6px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.hsk-hook:last-child{border-bottom:none;}
.hsk-name{font:12px ui-monospace,monospace;color:#1a7f37;font-weight:600;}
.hsk-cmd{font:12px ui-monospace,monospace;color:var(--fg,#24292f);word-break:break-all;}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const hooks = cfg.hooks || {};
  const hookEntries = Object.entries(hooks);

  let hooksHtml = '';
  if (hookEntries.length) {
    hooksHtml = '<div class="hsk-sec"><h3>Git hooks</h3>';
    for (const [hook, cmd] of hookEntries) {
      hooksHtml += `<div class="hsk-hook"><span class="hsk-name">${esc(hook)}</span><span class="hsk-cmd">${esc(cmd)}</span></div>`;
    }
    hooksHtml += '</div>';
  }

  const host = document.createElement('div');
  host.className = 'hsk-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="hsk-title"><span class="badge-hsk">Husky</span>.huskyrc.json</div>
<div class="hsk-sub">${hookEntries.length ? `${hookEntries.length} git hook${hookEntries.length !== 1 ? 's' : ''} configured` : 'Git hooks manager configuration'}</div>
${hooksHtml}`;
  return { parentNode: host };
}
