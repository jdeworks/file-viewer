const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.fbs-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-fbs{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f57c00;color:#fff;vertical-align:middle;margin-right:8px;}
.fbs-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.fbs-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.fbs-sec{margin:12px 0;}
.fbs-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.fbs-grid{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:8px 0;}
.fbs-key{font-size:12px;color:var(--fg-2,#888);}
.fbs-val{font:12px ui-monospace,monospace;color:var(--accent,#0969da);}
.fbs-pill{display:inline-block;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:2px 8px;font:12px ui-monospace,monospace;margin:2px;}
.fbs-pill.emu{background:#fff3e0;border-color:#ffb74d;color:#e65100;}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const hosting = cfg.hosting || null;
  const functions = cfg.functions || null;
  const emulators = cfg.emulators || null;
  const firestore = cfg.firestore || null;
  const storage = cfg.storage || null;

  const rewrites = Array.isArray(hosting?.rewrites) ? hosting.rewrites : [];
  const redirects = Array.isArray(hosting?.redirects) ? hosting.redirects : [];
  const headers = Array.isArray(hosting?.headers) ? hosting.headers : [];

  const emuKeys = emulators ? Object.keys(emulators).filter((k) => k !== 'ui') : [];

  let html = `<style>${CSS}</style>
<div class="fbs-title"><span class="badge-fbs">Firebase</span>firebase.json</div>
<div class="fbs-sub">Firebase project configuration</div>`;

  if (hosting) {
    html += `<div class="fbs-sec"><h3>Hosting</h3><div class="fbs-grid">
${hosting.public ? `<span class="fbs-key">Public dir</span><span class="fbs-val">${esc(hosting.public)}</span>` : ''}
${rewrites.length ? `<span class="fbs-key">Rewrites</span><span class="fbs-val">${rewrites.length}</span>` : ''}
${redirects.length ? `<span class="fbs-key">Redirects</span><span class="fbs-val">${redirects.length}</span>` : ''}
${headers.length ? `<span class="fbs-key">Header rules</span><span class="fbs-val">${headers.length}</span>` : ''}
</div></div>`;
  }

  if (functions) {
    html += `<div class="fbs-sec"><h3>Functions</h3><div class="fbs-grid">
${functions.source ? `<span class="fbs-key">Source</span><span class="fbs-val">${esc(functions.source)}</span>` : ''}
${functions.runtime ? `<span class="fbs-key">Runtime</span><span class="fbs-val">${esc(functions.runtime)}</span>` : ''}
</div></div>`;
  }

  if (emuKeys.length) {
    html += `<div class="fbs-sec"><h3>Emulators</h3><div>`;
    for (const k of emuKeys) {
      const port = emulators[k]?.port;
      html += `<span class="fbs-pill emu">${esc(k)}${port ? `:${port}` : ''}</span>`;
    }
    html += '</div></div>';
  }

  if (firestore || storage) {
    html += `<div class="fbs-sec"><h3>Services</h3><div>`;
    if (firestore) html += `<span class="fbs-pill">firestore</span>`;
    if (storage) html += `<span class="fbs-pill">storage</span>`;
    html += '</div></div>';
  }

  const host = document.createElement('div');
  host.className = 'fbs-doc';
  host.innerHTML = html;
  return { parentNode: host };
}
