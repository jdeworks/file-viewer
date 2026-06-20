// .node-version renderer: shows the pinned version prominently with LTS alias info and install hints.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nv-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-nv{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#417e38;color:#fff;vertical-align:middle;margin-right:8px;}
.nv-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.nv-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.nv-version{font:36px/1.2 ui-monospace,monospace;font-weight:700;color:var(--fg,#24292f);padding:16px 0 12px;}
.nv-pill{display:inline-block;padding:3px 12px;border-radius:12px;font-size:13px;font-weight:600;background:#e8f5e9;border:1px solid #a5d6a7;color:#1b5e20;margin-right:8px;}
.nv-pill.lts{background:#e8f5e9;border-color:#a5d6a7;color:#1b5e20;}
.nv-pill.semver{background:#e3f2fd;border-color:#90caf9;color:#0d47a1;}
.nv-sec{margin:16px 0 8px;}
.nv-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;font-weight:600;}
.nv-table{width:100%;border-collapse:collapse;font-size:13px;}
.nv-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.nv-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.nv-tool{font-weight:600;font-size:13px;}
.nv-cmd{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#666);}
.nv-compat{margin:12px 0;font-size:12px;color:var(--fg-2,#888);padding:10px 14px;background:var(--bg-2,#f6f8fa);border-radius:6px;border:1px solid var(--border,#e0e0e0);}
`;

const TOOLS = [
  { name: 'fnm',    cmd: (v) => `fnm install ${v}` },
  { name: 'volta',  cmd: (v) => `volta install node@${v}` },
  { name: 'nvm',    cmd: (v) => `nvm install ${v}` },
  { name: 'mise',   cmd: (v) => `mise install node@${v}` },
  { name: 'asdf',   cmd: (v) => `asdf install nodejs ${v}` },
];

export function render(intake) {
  const raw = (intake.text || '').trim();
  const isLts = /^lts\//i.test(raw);
  const isSemver = /^\d/.test(raw);
  const ltsName = isLts ? raw.slice(4) : null;
  const display = raw || '(empty)';

  const pillClass = isLts ? 'lts' : 'semver';
  const pillLabel = isLts ? `LTS — ${ltsName}` : (isSemver ? 'Semantic version' : 'Version alias');

  const managerRows = raw ? TOOLS.map((t) =>
    `<tr><td class="nv-tool">${esc(t.name)}</td><td class="nv-cmd">${esc(t.cmd(raw))}</td></tr>`,
  ).join('') : '';

  const host = document.createElement('div');
  host.className = 'nv-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="nv-title"><span class="badge-nv">Node.js</span>.node-version</div>
<div class="nv-sub">Node.js version pin · read by fnm, volta, nvm, mise, asdf</div>
<div class="nv-version">${esc(display)}</div>
<div><span class="nv-pill ${pillClass}">${esc(pillLabel)}</span></div>
${raw ? `<div class="nv-sec"><h3>Install with</h3>
<table class="nv-table">
  <thead><tr><th>Manager</th><th>Command</th></tr></thead>
  <tbody>${managerRows}</tbody>
</table></div>` : ''}
<div class="nv-compat"><strong>.node-version</strong> vs <strong>.nvmrc</strong> — both pin a Node.js version. <code>.node-version</code> is preferred by fnm and volta; <code>.nvmrc</code> is the nvm original. Most modern tools support both formats.</div>`;

  return { parentNode: host };
}
