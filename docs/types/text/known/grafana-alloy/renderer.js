const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const REDACT_KEYS = /password|bearer_token|secret|api_key|credentials/i;
function redactValue(key, val) {
  return REDACT_KEYS.test(key) ? '[configured]' : val;
}

const CSS = `
.grfalloy-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-alloy{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:linear-gradient(90deg,#FF7600,#F0571A);color:#fff;vertical-align:middle;margin-right:8px}
.alloy-title{font-size:18px;font-weight:700;margin:0 0 4px}
.alloy-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.alloy-sec{margin:14px 0}
.alloy-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.alloy-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.alloy-table{width:100%;border-collapse:collapse;font-size:13px}
.alloy-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.alloy-table td{padding:4px 8px;border-bottom:1px solid var(--border,#e8e8e8);font-family:ui-monospace,monospace;font-size:12px}
.alloy-table tr:last-child td{border-bottom:none}
.alloy-count{display:inline-block;font-size:11px;padding:1px 6px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg-2,#888);margin-left:4px}
.alloy-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px}
.alloy-kv-k{color:var(--fg-2,#888);min-width:180px;flex-shrink:0}
.alloy-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.alloy-comp-type{font-family:ui-monospace,monospace;font-size:12px;color:#b84500}
.alloy-comp-label{font-family:ui-monospace,monospace;font-size:12px}
.alloy-total{font-size:13px;color:var(--fg-2,#888);margin-top:10px}
`;

/**
 * Extract component blocks using River/Alloy syntax.
 * Block form: `component.type "label" { ... }`
 * Also handles unlabelled blocks: `logging { ... }`
 */
function parseAlloyComponents(text) {
  const components = [];
  // Labelled component blocks: component.type "label" {
  const labelledRe = /([\w.]+)\s+"([^"]+)"\s*\{/g;
  let m;
  while ((m = labelledRe.exec(text)) !== null) {
    const type = m[1];
    const label = m[2];
    // Extract body
    const startIdx = m.index + m[0].length;
    let depth = 1;
    let i = startIdx;
    while (i < text.length && depth > 0) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
      i++;
    }
    const body = text.slice(startIdx, i - 1);
    components.push({ type, label, body });
  }
  // Unlabelled blocks: logging { ... }, tracing { ... }
  const unlabelledRe = /^(logging|tracing|prometheus\.exporter\.\w+)\s*\{/gm;
  while ((m = unlabelledRe.exec(text)) !== null) {
    const type = m[1];
    const startIdx = m.index + m[0].length;
    let depth = 1;
    let i = startIdx;
    while (i < text.length && depth > 0) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
      i++;
    }
    const body = text.slice(startIdx, i - 1);
    components.push({ type, label: '', body });
  }
  return components;
}

/** Extract a simple string attribute value from a River block body */
function extractAttr(body, key) {
  const re = new RegExp(`\\b${key}\\s*=\\s*"([^"]*)"`, 'i');
  const m = body.match(re);
  return m ? m[1] : null;
}

/** Extract nested block attribute e.g. endpoint { url = "..." } */
function extractNestedAttr(body, blockName, attrName) {
  const blockRe = new RegExp(`\\b${blockName}\\s*\\{([^}]*)\\}`, 'i');
  const bm = body.match(blockRe);
  if (!bm) return null;
  const attrRe = new RegExp(`\\b${attrName}\\s*=\\s*"([^"]*)"`, 'i');
  const am = bm[1].match(attrRe);
  return am ? am[1] : null;
}

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="alloy-kv"><span class="alloy-kv-k">${esc(label)}</span><span class="alloy-kv-v">${esc(String(value))}</span></div>`;
}

export function render(intake) {
  const text = intake.text || '';
  const components = parseAlloyComponents(text);

  // Group by type
  const grouped = new Map();
  for (const c of components) {
    if (!grouped.has(c.type)) grouped.set(c.type, []);
    grouped.get(c.type).push(c);
  }

  // Summary table
  const tableRows = [...grouped.entries()].map(([type, list]) => {
    const labels = list.map((c) => c.label).filter(Boolean);
    return `<tr>
      <td class="alloy-comp-type">${esc(type)}</td>
      <td class="alloy-comp-label">${labels.map(esc).join(', ') || '<em style="color:var(--fg-2,#888)">—</em>'}</td>
      <td style="text-align:right"><span class="alloy-count">${list.length}</span></td>
    </tr>`;
  }).join('');

  const summaryHtml = tableRows ? `<div class="alloy-sec"><h3>Components</h3><div class="alloy-card">
<table class="alloy-table">
<thead><tr><th>Type</th><th>Label(s)</th><th style="text-align:right">Count</th></tr></thead>
<tbody>${tableRows}</tbody>
</table>
</div></div>` : '';

  // Detail cards for key component types
  const detailParts = [];

  for (const [type, list] of grouped.entries()) {
    for (const c of list) {
      if (type === 'prometheus.remote_write') {
        const url = extractAttr(c.body, 'url') || extractNestedAttr(c.body, 'endpoint', 'url') || '';
        const basicUser = extractNestedAttr(c.body, 'basic_auth', 'username') || '';
        const bearerToken = c.body.match(/bearer_token\s*=\s*"([^"]*)"/i)?.[1];
        if (url) {
          const safeUrl = redactValue('url', url);
          detailParts.push(`<div class="alloy-card">
<div style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin-bottom:6px">prometheus.remote_write <span style="color:#555">"${esc(c.label)}"</span></div>
${kv('url', safeUrl)}
${basicUser ? kv('basic_auth.username', basicUser) : ''}
${bearerToken != null ? kv('bearer_token', '[configured]') : ''}
</div>`);
        }
      } else if (type === 'prometheus.scrape') {
        const jobName = extractAttr(c.body, 'job_name') || extractAttr(c.body, 'job') || c.label;
        const targets = c.body.match(/"([^"]+:\d+)"/g);
        detailParts.push(`<div class="alloy-card">
<div style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin-bottom:6px">prometheus.scrape <span style="color:#555">"${esc(c.label)}"</span></div>
${kv('job_name', jobName)}
${targets ? kv('targets', targets.map((t) => t.replace(/"/g, '')).join(', ')) : ''}
</div>`);
      } else if (type === 'loki.write') {
        const url = extractAttr(c.body, 'url') || extractNestedAttr(c.body, 'endpoint', 'url') || '';
        if (url) {
          detailParts.push(`<div class="alloy-card">
<div style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin-bottom:6px">loki.write <span style="color:#555">"${esc(c.label)}"</span></div>
${kv('endpoint.url', url)}
</div>`);
        }
      } else if (type.startsWith('otelcol.exporter')) {
        const endpoint = extractAttr(c.body, 'endpoint') || extractNestedAttr(c.body, 'client', 'endpoint') || '';
        if (endpoint) {
          detailParts.push(`<div class="alloy-card">
<div style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin-bottom:6px">${esc(type)} <span style="color:#555">"${esc(c.label)}"</span></div>
${kv('endpoint', endpoint)}
</div>`);
        }
      } else if (type === 'logging' || type === 'tracing') {
        const level = extractAttr(c.body, 'level') || '';
        const format = extractAttr(c.body, 'format') || '';
        if (level || format) {
          detailParts.push(`<div class="alloy-card">
<div style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin-bottom:6px">${esc(type)}</div>
${kv('level', level)}
${kv('format', format)}
</div>`);
        }
      }
    }
  }

  const detailsHtml = detailParts.length ? `<div class="alloy-sec"><h3>Key Component Details</h3>${detailParts.join('')}</div>` : '';

  const totalCount = components.length;
  const subParts = [];
  if (totalCount) subParts.push(`${totalCount} component${totalCount !== 1 ? 's' : ''}`);
  if (grouped.size) subParts.push(`${grouped.size} type${grouped.size !== 1 ? 's' : ''}`);

  const host = document.createElement('div');
  host.className = 'grfalloy-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-alloy">Alloy</span>
  <span class="alloy-title">Grafana Alloy</span>
</div>
<div class="alloy-sub">${esc(subParts.join(' · '))} · River syntax</div>
${summaryHtml}${detailsHtml}
<div class="alloy-total">${totalCount} total component${totalCount !== 1 ? 's' : ''}</div>`;
  return { parentNode: host };
}
