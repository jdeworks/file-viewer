const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.lb-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-lb{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#ea580c;color:#fff;vertical-align:middle;margin-right:8px}
.lb-title{font-size:18px;font-weight:700;margin:0 0 4px}
.lb-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.lb-sec{margin:14px 0}
.lb-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.lb-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.lb-appender{margin:4px 0}
.lb-app-name{font:700 13px/1.4 ui-monospace,monospace}
.lb-app-class{font-size:11px;color:var(--fg-2,#888);margin-left:6px}
.lb-level{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:5px;margin-left:6px}
.lb-level.ERROR,.lb-level.WARN{background:#fee2e2;border:1px solid #fca5a5;color:#991b1b}
.lb-level.INFO{background:#dbeafe;border:1px solid #93c5fd;color:#1e40af}
.lb-level.DEBUG,.lb-level.TRACE{background:#f3f4f6;border:1px solid #d1d5db;color:#4b5563}
.lb-table{width:100%;border-collapse:collapse;font-size:13px}
.lb-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.lb-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px}
.lb-prop-name{color:var(--fg-2,#666)}
.lb-pills{display:flex;flex-wrap:wrap;gap:6px}
.lb-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.lb-err{color:#b91c1c;font-size:13px;padding:8px 0}
`;

// Short class name: strip leading package
function shortClass(cls) {
  if (!cls) return '';
  const parts = cls.split('.');
  return parts[parts.length - 1];
}

function levelBadge(level) {
  if (!level) return '';
  const l = level.toUpperCase();
  return `<span class="lb-level ${l}">${esc(l)}</span>`;
}

function attr(el, name) {
  return (el.getAttribute(name) || '').trim();
}

export async function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const doc = new DOMParser().parseFromString(text, 'text/xml');

  if (doc.getElementsByTagName('parsererror').length) {
    const d = document.createElement('div');
    d.className = 'lb-doc';
    d.innerHTML = `<style>${CSS}</style><p class="lb-err">Could not parse as XML.</p>`;
    return { parentNode: d };
  }

  const root = doc.documentElement;

  // Properties
  const propEls = [...root.querySelectorAll(':scope > property')];
  const propsHtml = propEls.length ? `
<div class="lb-sec"><h3>Properties (${propEls.length})</h3><div class="lb-card">
<table class="lb-table"><thead><tr><th>Name</th><th>Value</th></tr></thead><tbody>
${propEls.map((p) => `<tr><td class="lb-prop-name">${esc(attr(p, 'name') || attr(p, 'key'))}</td><td>${esc(attr(p, 'value'))}</td></tr>`).join('')}
</tbody></table></div></div>` : '';

  // Appenders
  const appenderEls = [...root.querySelectorAll(':scope > appender')];
  const appendersHtml = appenderEls.length ? `
<div class="lb-sec"><h3>Appenders (${appenderEls.length})</h3>
${appenderEls.map((a) => {
    const name = attr(a, 'name');
    const cls = attr(a, 'class');
    const shortCls = shortClass(cls);
    // File path if FileAppender / RollingFileAppender
    const fileEl = a.querySelector('file');
    const filePath = fileEl ? fileEl.textContent.trim() : '';
    // Pattern if present
    const patternEl = a.querySelector('encoder > pattern, pattern');
    const pattern = patternEl ? patternEl.textContent.trim().slice(0, 60) : '';
    return `<div class="lb-card">
<div class="lb-appender"><span class="lb-app-name">${esc(name)}</span><span class="lb-app-class">${esc(shortCls || cls)}</span></div>
${filePath ? `<div style="font-size:12px;color:var(--fg-2,#888)">file: <code>${esc(filePath)}</code></div>` : ''}
${pattern ? `<div style="font-size:11px;color:var(--fg-2,#888);margin-top:2px;font-family:ui-monospace,monospace;word-break:break-all">${esc(pattern)}${pattern.length >= 60 ? '…' : ''}</div>` : ''}
</div>`;
  }).join('')}
</div>` : '';

  // Root level
  const rootEl = root.querySelector(':scope > root');
  const rootLevel = rootEl ? attr(rootEl, 'level') : '';
  const rootAppenders = rootEl ? [...rootEl.querySelectorAll('appender-ref')].map((r) => attr(r, 'ref')) : [];
  const rootHtml = rootEl ? `
<div class="lb-sec"><h3>Root Logger</h3><div class="lb-card">
<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
Level${levelBadge(rootLevel)}
${rootAppenders.length ? `<span style="font-size:12px;color:var(--fg-2,#888);margin-left:8px">→ ${rootAppenders.map(esc).join(', ')}</span>` : ''}
</div>
</div></div>` : '';

  // Named loggers
  const loggerEls = [...root.querySelectorAll(':scope > logger')];
  const loggersHtml = loggerEls.length ? `
<div class="lb-sec"><h3>Loggers (${loggerEls.length})</h3><div class="lb-card">
<table class="lb-table"><thead><tr><th>Name</th><th>Level</th><th>Appenders</th></tr></thead><tbody>
${loggerEls.slice(0, 10).map((l) => {
    const name = attr(l, 'name');
    const level = attr(l, 'level');
    const additive = attr(l, 'additivity');
    const refs = [...l.querySelectorAll('appender-ref')].map((r) => attr(r, 'ref'));
    return `<tr>
<td>${esc(name)}</td>
<td>${level ? levelBadge(level) : '<span style="color:var(--fg-2,#888)">inherit</span>'}</td>
<td>${refs.length ? esc(refs.join(', ')) : (additive === 'false' ? '<span style="color:var(--fg-2,#888)">none (additivity=false)</span>' : '<span style="color:var(--fg-2,#888)">inherited</span>')}</td>
</tr>`;
  }).join('')}
</tbody></table>
${loggerEls.length > 10 ? `<div style="font-size:12px;color:var(--fg-2,#888);padding:4px 0">…and ${loggerEls.length - 10} more</div>` : ''}
</div></div>` : '';

  const filename = (intake.name || intake.filename || '').split('/').pop() || 'logback.xml';
  const subParts = [rootLevel ? `root: ${rootLevel.toUpperCase()}` : '', `${appenderEls.length} appender${appenderEls.length !== 1 ? 's' : ''}`].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'lb-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="lb-title"><span class="badge-lb">Logback</span>${esc(filename)}</div>
<div class="lb-sub">${esc(subParts.join(' · '))}</div>
${propsHtml}${appendersHtml}${rootHtml}${loggersHtml}`;
  return { parentNode: host };
}
