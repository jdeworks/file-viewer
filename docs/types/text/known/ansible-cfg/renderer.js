const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.anscfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-ans{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#c0392b;color:#fff;vertical-align:middle;margin-right:8px;}
.anscfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.anscfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.anscfg-sec{margin:10px 0;border:1px solid var(--border,#e0e0e0);border-radius:6px;overflow:hidden;}
.anscfg-sec-hd{padding:6px 12px;background:var(--bg-2,#f6f8fa);font-size:13px;font-weight:600;font-family:ui-monospace,monospace;cursor:pointer;display:flex;align-items:center;justify-content:space-between;user-select:none;}
.anscfg-sec-hd:hover{background:var(--bg-3,#eaeef2);}
.anscfg-sec-body{padding:0;}
.anscfg-table{width:100%;border-collapse:collapse;font-size:12px;}
.anscfg-table td{padding:5px 12px;border-top:1px solid var(--border,#e0e0e0);vertical-align:top;}
.anscfg-table td:first-child{font-family:ui-monospace,monospace;color:var(--fg-2,#888);width:40%;white-space:nowrap;}
.anscfg-table td:last-child{font-family:ui-monospace,monospace;word-break:break-word;}
.anscfg-highlight{color:#0969da;}
.anscfg-arrow{font-size:10px;color:var(--fg-2,#888);transition:transform .15s;}
.anscfg-arrow.open{transform:rotate(90deg);}
`;

const HIGHLIGHT_KEYS = new Set(['inventory', 'remote_user', 'roles_path', 'become', 'become_method', 'become_user', 'enable_plugins', 'retry_files_enabled']);

function parseIni(text) {
  const secs = {};
  let cur = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const sec = line.match(/^\[([^\]]+)\]/);
    if (sec) { cur = sec[1]; secs[cur] = []; continue; }
    if (cur) {
      const kv = line.match(/^([^=:]+)[=:](.*)/);
      if (kv) secs[cur].push([kv[1].trim(), kv[2].trim()]);
    }
  }
  return secs;
}

export function render(intake) {
  const secs = parseIni(intake.text || '');
  const secNames = Object.keys(secs);

  const sectionsHtml = secNames.map((sec, i) => {
    const pairs = secs[sec];
    const rows = pairs.map(([k, v]) => {
      const cls = HIGHLIGHT_KEYS.has(k) ? ' class="anscfg-highlight"' : '';
      return `<tr><td>${esc(k)}</td><td${cls}>${esc(v)}</td></tr>`;
    }).join('');
    const openClass = i === 0 ? ' open' : '';
    const bodyStyle = i === 0 ? '' : ' style="display:none"';
    const id = `anscfg-sec-${i}`;
    return `<div class="anscfg-sec">
  <div class="anscfg-sec-hd" onclick="(function(el){var body=el.nextElementSibling;var arr=el.querySelector('.anscfg-arrow');var open=body.style.display==='none';body.style.display=open?'':'none';arr.classList.toggle('open',open);})(this)">
    <span>[${esc(sec)}]</span>
    <span class="anscfg-arrow${openClass}">▶</span>
  </div>
  <div class="anscfg-sec-body"${bodyStyle}>
    ${pairs.length ? `<table class="anscfg-table"><tbody>${rows}</tbody></table>` : '<p style="padding:8px 12px;color:var(--fg-2,#888);font-size:12px;margin:0">No settings.</p>'}
  </div>
</div>`;
  }).join('');

  const totalKeys = secNames.reduce((n, s) => n + secs[s].length, 0);

  const host = document.createElement('div');
  host.className = 'anscfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="anscfg-title"><span class="badge-ans">Ansible</span>ansible.cfg</div>
<div class="anscfg-sub">${secNames.length} section${secNames.length !== 1 ? 's' : ''} · ${totalKeys} setting${totalKeys !== 1 ? 's' : ''}</div>
${sectionsHtml || '<p style="color:var(--fg-2,#888);font-size:13px;">No configuration sections found.</p>'}`;
  return { parentNode: host };
}
