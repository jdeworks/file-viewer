const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.devcontainer-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-devcontainer{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0ea5e9;color:#fff;vertical-align:middle;margin-right:8px;}
.devcontainer-doc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.devcontainer-doc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.devcontainer-doc-sec{margin:12px 0;}
.devcontainer-doc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.devcontainer-doc-pills{display:flex;flex-wrap:wrap;gap:6px;}
.devcontainer-doc-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.devcontainer-doc-pill.feat{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8;}
.devcontainer-doc-pill.port{background:#fef3c7;border-color:#fcd34d;color:#92400e;}
.devcontainer-doc-pill.ext{background:#f0fdf4;border-color:#86efac;color:#166534;font-family:ui-monospace,monospace;font-size:11px;}
.devcontainer-doc-cmd{font:12px/1.5 ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:5px 10px;white-space:pre-wrap;word-break:break-all;}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = intake.parsed ?? JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const name = cfg.name || '';
  const image = cfg.image || (cfg.build?.dockerfile ? `Dockerfile: ${cfg.build.dockerfile}` : '');
  const remoteUser = cfg.remoteUser || '';
  const features = cfg.features ? Object.keys(cfg.features) : [];
  const ports = Array.isArray(cfg.forwardPorts) ? cfg.forwardPorts : [];
  const portsAttrs = cfg.portsAttributes || {};
  const postCreate = cfg.postCreateCommand || '';
  const postStart = cfg.postStartCommand || '';
  const extensions = cfg.customizations?.vscode?.extensions || cfg.extensions || [];

  // Shorten image: extract last meaningful segment e.g. "python:3.11" from full path
  const imageShort = image ? image.split('/').pop() : '';

  const featHtml = features.length
    ? `<div class="devcontainer-doc-sec"><h3>Features (${features.length})</h3><div class="devcontainer-doc-pills">${features.slice(0, 8).map((f) => {
        const short = f.split('/').pop().split(':')[0];
        return `<span class="devcontainer-doc-pill feat">${esc(short)}</span>`;
      }).join('')}</div></div>`
    : '';

  const portHtml = ports.length
    ? `<div class="devcontainer-doc-sec"><h3>Forwarded ports</h3><div class="devcontainer-doc-pills">${ports.slice(0, 12).map((p) => {
        const label = portsAttrs[String(p)]?.label;
        return `<span class="devcontainer-doc-pill port">${esc(p)}${label ? ` <small>${esc(label)}</small>` : ''}</span>`;
      }).join('')}</div></div>`
    : '';

  const extHtml = extensions.length
    ? `<div class="devcontainer-doc-sec"><h3>VS Code extensions (${extensions.length})</h3><div class="devcontainer-doc-pills">${extensions.slice(0, 8).map((e) => `<span class="devcontainer-doc-pill ext">${esc(e)}</span>`).join('')}${extensions.length > 8 ? `<span class="devcontainer-doc-pill">+${extensions.length - 8} more</span>` : ''}</div></div>`
    : '';

  const truncate = (s, n) => s.length > n ? s.slice(0, n) + '…' : s;
  const cmdHtml = (postCreate || postStart)
    ? `<div class="devcontainer-doc-sec"><h3>Commands</h3>
        ${postCreate ? `<div style="margin-bottom:4px"><span style="font-size:11px;color:var(--fg-2,#888)">postCreate: </span><span class="devcontainer-doc-cmd">${esc(truncate(postCreate, 60))}</span></div>` : ''}
        ${postStart ? `<div><span style="font-size:11px;color:var(--fg-2,#888)">postStart: </span><span class="devcontainer-doc-cmd">${esc(truncate(postStart, 60))}</span></div>` : ''}
      </div>`
    : '';

  const host = document.createElement('div');
  host.className = 'devcontainer-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="devcontainer-doc-title"><span class="badge-devcontainer">devcontainer</span>${esc(name || 'devcontainer.json')}</div>
<div class="devcontainer-doc-sub">${imageShort ? esc(imageShort) : 'Development container configuration'}</div>
${image ? `<div class="devcontainer-doc-sec"><h3>Image</h3><div class="devcontainer-doc-pills">
  <span class="devcontainer-doc-pill">${esc(image)}</span>
  ${remoteUser ? `<span class="devcontainer-doc-pill">user: ${esc(remoteUser)}</span>` : ''}
</div></div>` : ''}
${featHtml}${portHtml}${extHtml}${cmdHtml}`;
  return { parentNode: host };
}
