const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.l4j-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-l4j{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#ca8a04;color:#fff;vertical-align:middle;margin-right:8px}
.l4j-title{font-size:18px;font-weight:700;margin:0 0 4px}
.l4j-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.l4j-sec{margin:14px 0}
.l4j-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.l4j-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.l4j-app-name{font:700 13px/1.4 ui-monospace,monospace}
.l4j-app-type{font-size:11px;color:var(--fg-2,#888);margin-left:6px}
.l4j-level{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:5px;margin-left:6px}
.l4j-level.ERROR,.l4j-level.WARN,.l4j-level.FATAL{background:#fee2e2;border:1px solid #fca5a5;color:#991b1b}
.l4j-level.INFO{background:#dbeafe;border:1px solid #93c5fd;color:#1e40af}
.l4j-level.DEBUG,.l4j-level.TRACE,.l4j-level.ALL{background:#f3f4f6;border:1px solid #d1d5db;color:#4b5563}
.l4j-table{width:100%;border-collapse:collapse;font-size:13px}
.l4j-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.l4j-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px}
.l4j-err{color:#b91c1c;font-size:13px;padding:8px 0}
`;

function attr(el, name) {
  return (el.getAttribute(name) || '').trim();
}

function levelBadge(level) {
  if (!level) return '';
  const l = level.toUpperCase();
  return `<span class="l4j-level ${l}">${esc(l)}</span>`;
}

// Log4j2 XML uses a different structure from Logback — all elements are children of
// <Configuration>. The Appenders section contains typed elements (Console, File, RollingFile…).
// The Loggers section contains <Root> and <Logger> elements.
export async function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const doc = new DOMParser().parseFromString(text, 'text/xml');

  if (doc.getElementsByTagName('parsererror').length) {
    const d = document.createElement('div');
    d.className = 'l4j-doc';
    d.innerHTML = `<style>${CSS}</style><p class="l4j-err">Could not parse as XML.</p>`;
    return { parentNode: d };
  }

  const config = doc.documentElement;

  // Properties
  const propertiesEl = config.querySelector('Properties');
  const propEls = propertiesEl ? [...propertiesEl.querySelectorAll('Property')] : [];
  const propsHtml = propEls.length ? `
<div class="l4j-sec"><h3>Properties (${propEls.length})</h3><div class="l4j-card">
<table class="l4j-table"><thead><tr><th>Name</th><th>Value</th></tr></thead><tbody>
${propEls.map((p) => `<tr><td>${esc(attr(p, 'name'))}</td><td>${esc(p.textContent.trim())}</td></tr>`).join('')}
</tbody></table></div></div>` : '';

  // Appenders — in Log4j2 the element tag IS the appender type (Console, File, RollingFile, …)
  const appendersEl = config.querySelector('Appenders');
  const appenderEls = appendersEl ? [...appendersEl.children] : [];
  const appendersHtml = appenderEls.length ? `
<div class="l4j-sec"><h3>Appenders (${appenderEls.length})</h3>
${appenderEls.map((a) => {
    const name = attr(a, 'name');
    const type = a.tagName;
    const fileAttr = attr(a, 'fileName') || attr(a, 'filename');
    const patternEl = a.querySelector('PatternLayout');
    const pattern = patternEl ? (attr(patternEl, 'pattern') || '').slice(0, 60) : '';
    return `<div class="l4j-card">
<div><span class="l4j-app-name">${esc(name)}</span><span class="l4j-app-type">${esc(type)}</span></div>
${fileAttr ? `<div style="font-size:12px;color:var(--fg-2,#888)">file: <code>${esc(fileAttr)}</code></div>` : ''}
${pattern ? `<div style="font-size:11px;color:var(--fg-2,#888);margin-top:2px;font-family:ui-monospace,monospace;word-break:break-all">${esc(pattern)}${pattern.length >= 60 ? '…' : ''}</div>` : ''}
</div>`;
  }).join('')}
</div>` : '';

  // Loggers
  const loggersEl = config.querySelector('Loggers');
  const rootEl = loggersEl ? loggersEl.querySelector('Root') : null;
  const rootLevel = rootEl ? attr(rootEl, 'level') : '';
  const rootAppenders = rootEl ? [...rootEl.querySelectorAll('AppenderRef')].map((r) => attr(r, 'ref')) : [];
  const rootHtml = rootEl ? `
<div class="l4j-sec"><h3>Root Logger</h3><div class="l4j-card">
<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
Level${levelBadge(rootLevel)}
${rootAppenders.length ? `<span style="font-size:12px;color:var(--fg-2,#888);margin-left:8px">→ ${rootAppenders.map(esc).join(', ')}</span>` : ''}
</div>
</div></div>` : '';

  const loggerEls = loggersEl ? [...loggersEl.querySelectorAll('Logger')] : [];
  const loggersHtml = loggerEls.length ? `
<div class="l4j-sec"><h3>Loggers (${loggerEls.length})</h3><div class="l4j-card">
<table class="l4j-table"><thead><tr><th>Name</th><th>Level</th><th>Appenders</th><th>Additivity</th></tr></thead><tbody>
${loggerEls.slice(0, 10).map((l) => {
    const name = attr(l, 'name');
    const level = attr(l, 'level');
    const additivity = attr(l, 'additivity');
    const refs = [...l.querySelectorAll('AppenderRef')].map((r) => attr(r, 'ref'));
    return `<tr>
<td>${esc(name)}</td>
<td>${level ? levelBadge(level) : '<span style="color:var(--fg-2,#888)">inherit</span>'}</td>
<td>${refs.length ? esc(refs.join(', ')) : '<span style="color:var(--fg-2,#888)">root</span>'}</td>
<td>${additivity ? esc(additivity) : '<span style="color:var(--fg-2,#888)">true</span>'}</td>
</tr>`;
  }).join('')}
</tbody></table>
${loggerEls.length > 10 ? `<div style="font-size:12px;color:var(--fg-2,#888);padding:4px 0">…and ${loggerEls.length - 10} more</div>` : ''}
</div></div>` : '';

  const filename = (intake.name || intake.filename || '').split('/').pop() || 'log4j2.xml';
  const subParts = [
    rootLevel ? `root: ${rootLevel.toUpperCase()}` : '',
    appenderEls.length ? `${appenderEls.length} appender${appenderEls.length !== 1 ? 's' : ''}` : '',
    loggerEls.length ? `${loggerEls.length} logger${loggerEls.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'l4j-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="l4j-title"><span class="badge-l4j">Log4j2</span>${esc(filename)}</div>
<div class="l4j-sub">${esc(subParts.join(' · '))}</div>
${propsHtml}${appendersHtml}${rootHtml}${loggersHtml}`;
  return { parentNode: host };
}
