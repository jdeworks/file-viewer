const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rsc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-rsc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#CC0000;color:#fff;vertical-align:middle;margin-right:8px;}
.rsc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.rsc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.rsc-sec{margin:12px 0;}
.rsc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.rsc-pills{display:flex;flex-wrap:wrap;gap:6px;}
.rsc-pill{display:inline-flex;align-items:center;gap:5px;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.rsc-pill .flag{font:12px/1 ui-monospace,monospace;font-weight:600;color:var(--fg,#24292f);}
.rsc-pill .val{font:12px/1 ui-monospace,monospace;color:var(--fg-2,#666);}
.rsc-pill.highlight{background:#fff1f0;border-color:#fca5a5;color:#991b1b;}
.rsc-pill.req{background:#f0fdf4;border-color:#86efac;color:#166534;}
.rsc-kv{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:13px;margin:4px 0;}
.rsc-kv dt{font-weight:600;white-space:nowrap;color:var(--fg-2,#555);}
.rsc-kv dd{margin:0;font:13px ui-monospace,monospace;}
`;

export function render(intake) {
  const lines = (intake.text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  // Parse each line into { flag, value }
  const parsed = lines.map((line) => {
    const m = line.match(/^(--[\w-]+(?:=\S+)?)(?:\s+(.+))?$/);
    if (!m) return { flag: line, value: '' };
    // Handle --flag=value form
    const eqIdx = m[1].indexOf('=');
    if (eqIdx !== -1) return { flag: m[1].slice(0, eqIdx), value: m[1].slice(eqIdx + 1) };
    return { flag: m[1], value: (m[2] || '').trim() };
  });

  const formatEntry = parsed.find((p) => p.flag === '--format');
  const requireEntries = parsed.filter((p) => p.flag === '--require');
  const orderEntry = parsed.find((p) => p.flag === '--order');
  const otherFlags = parsed.filter(
    (p) => p.flag !== '--format' && p.flag !== '--require' && p.flag !== '--order',
  );

  const subtitle = `${lines.length} flag${lines.length !== 1 ? 's' : ''} configured`;

  const flagsHtml = parsed.length
    ? `<div class="rsc-sec"><h3>All Flags</h3><div class="rsc-pills">${parsed.map((p) => {
        const cls = p.flag === '--format' ? 'highlight' : p.flag === '--require' ? 'req' : '';
        return `<span class="rsc-pill ${cls}"><span class="flag">${esc(p.flag)}</span>${p.value ? `<span class="val">${esc(p.value)}</span>` : ''}</span>`;
      }).join('')}</div></div>`
    : '';

  const detailRows = [];
  if (formatEntry) detailRows.push(`<dt>Format</dt><dd>${esc(formatEntry.value || '(default)')}</dd>`);
  if (orderEntry) detailRows.push(`<dt>Order</dt><dd>${esc(orderEntry.value || 'defined')}</dd>`);

  const detailHtml = detailRows.length
    ? `<div class="rsc-sec"><h3>Key Settings</h3><dl class="rsc-kv">${detailRows.join('')}</dl></div>`
    : '';

  const requireHtml = requireEntries.length
    ? `<div class="rsc-sec"><h3>Required Files</h3><div class="rsc-pills">${requireEntries.map((r) => `<span class="rsc-pill req"><span class="flag">${esc(r.value)}</span></span>`).join('')}</div></div>`
    : '';

  const randomNote = orderEntry && orderEntry.value === 'random'
    ? `<div class="rsc-sec" style="font-size:12px;color:var(--fg-2,#666);">Tests run in random order — use <code style="font-size:11px">--seed &lt;n&gt;</code> to reproduce a specific run.</div>`
    : '';

  const host = document.createElement('div');
  host.className = 'rsc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="rsc-title"><span class="badge-rsc">RSpec</span>.rspec</div>
<div class="rsc-sub">${esc(subtitle)}</div>
${flagsHtml}${detailHtml}${requireHtml}${randomNote}`;

  return { parentNode: host };
}
