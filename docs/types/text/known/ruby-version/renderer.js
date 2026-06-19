const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rv-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-rv{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#cc342d;color:#fff;vertical-align:middle;margin-right:8px;}
.rv-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.rv-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.rv-version{font:32px/1.2 ui-monospace,monospace;font-weight:700;color:var(--fg,#24292f);padding:16px 0 10px;}
.rv-pill{display:inline-block;padding:3px 12px;border-radius:12px;font-size:13px;font-weight:600;background:#fef2f2;border:1px solid #fca5a5;color:#7f1d1d;margin-right:6px;}
.rv-sec{margin:16px 0 8px;}
.rv-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.rv-table{width:100%;border-collapse:collapse;font-size:13px;}
.rv-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.rv-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.rv-tool{font-weight:600;font-size:13px;}
.rv-cmd{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);}
`;

const MANAGERS = [
  { name: 'rbenv', cmd: (v) => `rbenv install ${v}` },
  { name: 'rvm', cmd: (v) => `rvm install ${v}` },
  { name: 'asdf', cmd: (v) => `asdf install ruby ${v}` },
  { name: 'chruby + ruby-install', cmd: (v) => `ruby-install ruby ${v}` },
  { name: 'mise', cmd: (v) => `mise install ruby@${v}` },
];

export function render(intake) {
  const raw = (intake.text || '').trim().split('\n')[0].trim();

  // Normalise: strip leading "ruby-" prefix and trailing patch info like -p0
  const normalised = raw.replace(/^ruby-/i, '').replace(/-p\d+$/, '');

  const managerRows = MANAGERS.map((m) =>
    `<tr><td class="rv-tool">${esc(m.name)}</td><td class="rv-cmd">${esc(m.cmd(normalised))}</td></tr>`,
  ).join('');

  const host = document.createElement('div');
  host.className = 'rv-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="rv-title"><span class="badge-rv">Ruby</span>.ruby-version</div>
<div class="rv-sub">Ruby version pin — used by rbenv, rvm, asdf, chruby, and mise</div>
<div class="rv-version">${esc(raw)}</div>
<div><span class="rv-pill">${esc(normalised)}</span></div>
<div class="rv-sec"><h3>Install with</h3>
  <table class="rv-table">
    <thead><tr><th>Manager</th><th>Command</th></tr></thead>
    <tbody>${managerRows}</tbody>
  </table>
</div>`;

  return { parentNode: host };
}
