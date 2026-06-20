import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.falco-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.falco-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00BCD4;color:#fff;vertical-align:middle;margin-right:8px}
.falco-title{font-size:18px;font-weight:700;margin:0 0 4px}
.falco-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.falco-sec{margin:14px 0}
.falco-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.falco-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.falco-card-name{font:700 13px/1.4 ui-monospace,monospace;color:var(--fg,#24292f);margin-bottom:4px}
.falco-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:12px}
.falco-kv-k{color:var(--fg-2,#888);min-width:80px;flex-shrink:0}
.falco-kv-v{font-family:ui-monospace,monospace;word-break:break-all;color:var(--fg,#24292f)}
.falco-chip{display:inline-block;font-size:11px;padding:2px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0}
.falco-pri{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;margin-left:6px}
.falco-pri.CRITICAL{background:#fde8e8;border:1px solid #fca5a5;color:#b91c1c}
.falco-pri.ERROR{background:#fff0eb;border:1px solid #f7b799;color:#c0392b}
.falco-pri.WARNING{background:#fff8e1;border:1px solid #ffe082;color:#b45309}
.falco-pri.NOTICE{background:#eaf4ff;border:1px solid #a5c8f7;color:#1a5c99}
.falco-pri.INFO{background:#e8f5e9;border:1px solid #a5d6a7;color:#1b5e20}
`;

function priClass(p) {
  const u = String(p || '').toUpperCase();
  const known = ['CRITICAL', 'ERROR', 'WARNING', 'NOTICE', 'INFO'];
  return known.includes(u) ? u : '';
}

export async function render(intake) {
  let items = [];
  try {
    const parsed = (jsYaml.loadAll(intake.text || \'\') || [])[0];
    items = Array.isArray(parsed) ? parsed : [];
  } catch { items = []; }

  const rules = items.filter((i) => i && i.rule);
  const macros = items.filter((i) => i && i.macro);
  const lists = items.filter((i) => i && i.list);

  const rulesHtml = rules.map((r) => {
    const name = String(r.rule || '');
    const priority = String(r.priority || '').toUpperCase();
    const pc = priClass(priority);
    const tags = Array.isArray(r.tags) ? r.tags : (r.tags ? String(r.tags).split(',').map((t) => t.trim()) : []);
    const condition = String(r.condition || '').replace(/\s+/g, ' ').trim();
    const condTrunc = condition.length > 100 ? condition.slice(0, 100) + '…' : condition;
    const output = String(r.output || '').replace(/\s+/g, ' ').trim();
    const outTrunc = output.length > 80 ? output.slice(0, 80) + '…' : output;
    const tagsHtml = tags.map((t) => `<span class="falco-chip">${esc(t)}</span>`).join('');
    return `<div class="falco-card">
<div class="falco-card-name">${esc(name)}${pc ? `<span class="falco-pri ${pc}">${esc(priority)}</span>` : (priority ? `<span class="falco-pri">${esc(priority)}</span>` : '')}</div>
${tags.length > 0 ? `<div style="margin:4px 0">${tagsHtml}</div>` : ''}
${condTrunc ? `<div class="falco-kv"><span class="falco-kv-k">condition</span><span class="falco-kv-v">${esc(condTrunc)}</span></div>` : ''}
${outTrunc ? `<div class="falco-kv"><span class="falco-kv-k">output</span><span class="falco-kv-v">${esc(outTrunc)}</span></div>` : ''}
</div>`;
  }).join('');

  const macrosHtml = macros.length
    ? macros.map((m) => `<span class="falco-chip">${esc(m.macro)}</span>`).join('')
    : '';

  const listsHtml = lists.length
    ? lists.map((l) => `<span class="falco-chip">${esc(l.list)}</span>`).join('')
    : '';

  const subParts = [
    `${rules.length} rule${rules.length !== 1 ? 's' : ''}`,
    `${macros.length} macro${macros.length !== 1 ? 's' : ''}`,
    `${lists.length} list${lists.length !== 1 ? 's' : ''}`,
  ];

  const host = document.createElement('div');
  host.className = 'falco-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="falco-badge">Falco Rules</span>
  <span class="falco-title">Runtime Security Rules</span>
</div>
<div class="falco-sub">${esc(subParts.join(' · '))}</div>
${rules.length > 0 ? `<div class="falco-sec"><h3>Rules</h3>${rulesHtml}</div>` : ''}
${macros.length > 0 ? `<div class="falco-sec"><h3>Macros</h3>${macrosHtml}</div>` : ''}
${lists.length > 0 ? `<div class="falco-sec"><h3>Lists</h3>${listsHtml}</div>` : ''}`;

  return { parentNode: host };
}
