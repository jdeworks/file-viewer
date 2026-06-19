const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nvm-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-nvm{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#417e38;color:#fff;vertical-align:middle;margin-right:8px;}
.nvm-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.nvm-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.nvm-version{font:32px/1.2 ui-monospace,monospace;font-weight:700;color:var(--fg,#24292f);padding:16px 0;}
.nvm-pill{display:inline-block;padding:3px 12px;border-radius:12px;font-size:13px;font-weight:600;background:#e8f5e9;border:1px solid #a5d6a7;color:#1b5e20;}
`;

export function render(intake) {
  const raw = (intake.text || '').trim();
  const isLts = /^lts\//i.test(raw);
  const display = raw || '(empty)';
  const ltsName = isLts ? raw.slice(4) : null;

  const host = document.createElement('div');
  host.className = 'nvm-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="nvm-title"><span class="badge-nvm">Node.js</span>.nvmrc</div>
<div class="nvm-sub">Node version manager pin</div>
<div class="nvm-version">${esc(display)}</div>
<div><span class="nvm-pill">${isLts ? `LTS — ${esc(ltsName)}` : 'Specific version'}</span></div>`;
  return { parentNode: host };
}
