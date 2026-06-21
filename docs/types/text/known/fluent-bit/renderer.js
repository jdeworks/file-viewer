// Fluent Bit config (fluent-bit.conf) viewer. Parses [SERVICE]/[INPUT]/[FILTER]/[OUTPUT]
// sections (space-separated key/value lines). Pure text parsing — no eval, no execution.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.fb-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-fb{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0a6e4f;color:#fff;vertical-align:middle;margin-right:8px}
.fb-title{font-size:18px;font-weight:700;margin:0 0 4px}
.fb-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.fb-sec{margin:14px 0}
.fb-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.fb-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff)}
.fb-card-name{font:700 13px/1.4 ui-monospace,monospace;margin-bottom:4px}
.fb-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px}
.fb-kv-k{color:var(--fg-2,#888);min-width:120px;font-family:ui-monospace,monospace}
.fb-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.fb-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#e6f4ee;border:1px solid #9fd6c0;color:#0a6e4f;margin-left:4px}
`;

const SECTION_RE = /^\[(\w+)\]\s*$/;

function parseFluentBit(text) {
  const sections = [];
  let current = null;
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/^\s+/, '');
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const sm = SECTION_RE.exec(line.trim());
    if (sm) {
      current = { name: sm[1].toUpperCase(), kv: [] };
      sections.push(current);
      continue;
    }
    if (!current) continue;
    const trimmed = line.replace(/\s+$/, '');
    const m = /^(\S+)\s+(.+)$/.exec(trimmed);
    if (m) current.kv.push({ key: m[1], val: m[2].trim() });
  }
  return sections;
}

function lookup(kv, key) {
  const e = kv.find((x) => x.key.toLowerCase() === key.toLowerCase());
  return e ? e.val : '';
}

export function render(intake) {
  const text = intake.text || '';
  const sections = parseFluentBit(text);

  const service = sections.find((s) => s.name === 'SERVICE');
  const inputs = sections.filter((s) => s.name === 'INPUT');
  const filters = sections.filter((s) => s.name === 'FILTER');
  const outputs = sections.filter((s) => s.name === 'OUTPUT');

  function kvRow(key, val) {
    if (!val) return '';
    return `<div class="fb-kv"><span class="fb-kv-k">${esc(key)}</span><span class="fb-kv-v">${esc(val)}</span></div>`;
  }

  function pluginCard(sec, primaryKeys, nameKey) {
    const pluginName = lookup(sec.kv, nameKey) || '(unnamed)';
    const shown = new Set([nameKey.toLowerCase()]);
    const rows = primaryKeys.map((k) => {
      shown.add(k.toLowerCase());
      return kvRow(k, lookup(sec.kv, k));
    }).join('');
    const extras = sec.kv
      .filter((e) => !shown.has(e.key.toLowerCase()))
      .slice(0, 4)
      .map((e) => kvRow(e.key, e.val)).join('');
    return `<div class="fb-card"><div class="fb-card-name">${esc(pluginName)}</div>${rows}${extras}</div>`;
  }

  const serviceHtml = service
    ? `<div class="fb-sec"><h3>Service</h3><div class="fb-card">${service.kv.slice(0, 8).map((e) => kvRow(e.key, e.val)).join('')}</div></div>`
    : '';

  const inputsHtml = inputs.length
    ? `<div class="fb-sec"><h3>Inputs (${inputs.length})</h3>${inputs.map((s) => pluginCard(s, ['Path', 'Tag', 'Parser'], 'Name')).join('')}</div>`
    : '';

  const filtersHtml = filters.length
    ? `<div class="fb-sec"><h3>Filters (${filters.length})</h3>${filters.map((s) => pluginCard(s, ['Match'], 'Name')).join('')}</div>`
    : '';

  const outputsHtml = outputs.length
    ? `<div class="fb-sec"><h3>Outputs (${outputs.length})</h3>${outputs.map((s) => pluginCard(s, ['Match', 'Host', 'Port'], 'Name')).join('')}</div>`
    : '';

  const parts = [];
  if (inputs.length) parts.push(`${inputs.length} input${inputs.length !== 1 ? 's' : ''}`);
  if (filters.length) parts.push(`${filters.length} filter${filters.length !== 1 ? 's' : ''}`);
  if (outputs.length) parts.push(`${outputs.length} output${outputs.length !== 1 ? 's' : ''}`);
  const sub = parts.join(' · ');

  const host = document.createElement('div');
  host.className = 'fb-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-fb">Fluent Bit</span>
  <span class="fb-title">fluent-bit.conf</span>
  ${parts.length ? `<span class="fb-tag">${esc(sub)}</span>` : ''}
</div>
<div class="fb-sub">Log processor pipeline configuration</div>
${serviceHtml}${inputsHtml}${filtersHtml}${outputsHtml}
${!sections.length ? '<div style="color:var(--fg-2,#888);font-size:13px;">No Fluent Bit sections detected.</div>' : ''}`;

  return { parentNode: host };
}
