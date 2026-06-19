const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.tfv-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-tfv{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#5C4EE5;color:#fff;vertical-align:middle;margin-right:8px}
.tfv-title{font-size:18px;font-weight:700;margin:0 0 4px}
.tfv-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.tfv-table{width:100%;border-collapse:collapse;font-size:13px}
.tfv-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.tfv-table td{padding:6px 8px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top}
.tfv-key{font:13px/1.4 ui-monospace,monospace;font-weight:600}
.tfv-val{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block}
.tfv-redacted{font:12px/1.4 ui-monospace,monospace;color:#b91c1c;background:#fef2f2;border-radius:4px;padding:1px 6px}
.tfv-type{font-size:11px;color:var(--fg-2,#888);background:var(--bg-2,#f6f8fa);border-radius:4px;padding:1px 5px;margin-left:4px}
`;

const SENSITIVE = /secret|password|token|key|credential|private/i;

function parseTfvars(text) {
  const vars = [];
  let i = 0;
  const lines = text.split('\n');
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) { i++; continue; }
    const eqIdx = line.indexOf('=');
    if (eqIdx < 1) { i++; continue; }
    const key = line.slice(0, eqIdx).trim();
    let rest = line.slice(eqIdx + 1).trim();

    if (rest.startsWith('[') || rest.startsWith('{')) {
      const open = rest.startsWith('[') ? '[' : '{';
      const close = open === '[' ? ']' : '}';
      let depth = 0;
      let collected = '';
      for (let j = i; j < lines.length; j++) {
        const seg = lines[j];
        collected += (j === i ? rest : seg) + '\n';
        for (const ch of (j === i ? rest : seg)) {
          if (ch === open) depth++;
          if (ch === close) depth--;
        }
        if (depth <= 0) { i = j + 1; break; }
        if (j === lines.length - 1) { i = j + 1; }
      }
      const inner = collected.trim();
      const isArr = inner.startsWith('[');
      const count = (inner.match(/,/g) || []).length + (inner.length > 2 ? 1 : 0);
      vars.push({ key, kind: isArr ? 'list' : 'map', count });
    } else {
      let val = rest;
      if (/^".*"$/.test(val)) val = val.slice(1, -1);
      else if (/^'.*'$/.test(val)) val = val.slice(1, -1);
      vars.push({ key, kind: 'string', val });
      i++;
    }
  }
  return vars;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const vars = parseTfvars(text);

  const rows = vars.map((v) => {
    const sensitive = SENSITIVE.test(v.key);
    let valueCell;
    if (sensitive) {
      valueCell = `<span class="tfv-redacted">[redacted]</span>`;
    } else if (v.kind === 'string') {
      const display = v.val.length > 80 ? v.val.slice(0, 77) + '…' : v.val;
      valueCell = `<span class="tfv-val">${esc(display)}</span>`;
    } else {
      valueCell = `<span class="tfv-type">${esc(v.kind)}</span><span style="font-size:12px;color:var(--fg-2,#888)"> ${v.count} item${v.count !== 1 ? 's' : ''}</span>`;
    }
    return `<tr><td><span class="tfv-key">${esc(v.key)}</span></td><td>${valueCell}</td></tr>`;
  }).join('');

  const tableHtml = vars.length
    ? `<table class="tfv-table"><thead><tr><th>Variable</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table>`
    : '<div style="color:var(--fg-2,#888);font-size:13px">No variables found</div>';

  const host = document.createElement('div');
  host.className = 'tfv-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="tfv-title"><span class="badge-tfv">terraform</span>.tfvars</div>
<div class="tfv-sub">${vars.length} variable${vars.length !== 1 ? 's' : ''}</div>
${tableHtml}`;
  return { parentNode: host };
}
