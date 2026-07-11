import { parseNetcdfHeader } from './parser.js';

function esc(s) { return String(s ?? '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

const STYLE = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;font-size:13px;color:var(--fg,#1a1a1a);background:var(--bg,#f5f5f5);padding:18px 16px}
.nc-header{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:18px}
.badge{display:inline-block;font-weight:700;font-size:11px;letter-spacing:.06em;padding:3px 9px;border-radius:4px;border:1px solid transparent}
.badge-nc{background:#0277bd;color:#fff;font-size:13px;padding:4px 12px}
.badge-ver{background:#e3f2fd;color:#01579b;border-color:#90caf9}
.badge-size{background:var(--bg2,#eee);color:var(--fg2,#555);border-color:var(--border,#d0d0d0)}
.sec{margin-bottom:20px}
.sec-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--fg2,#666);border-bottom:1px solid var(--border,#e0e0e0);padding-bottom:4px;margin-bottom:8px}
.card{background:var(--panel,#fff);border:1px solid var(--border,#e0e0e0);border-radius:6px;overflow:hidden}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:6px 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--fg2,#777);background:var(--th-bg,#f9f9f9);border-bottom:1px solid var(--border,#e8e8e8)}
td{padding:5px 12px;border-bottom:1px solid var(--border,#f0f0f0);word-break:break-all}
tr:last-child td{border-bottom:none}
tr:hover td{background:var(--hover,#fafafa)}
.td-type{color:#1565c0;font-size:11px;font-weight:600;font-family:monospace;white-space:nowrap}
.td-dims{color:var(--fg2,#555);font-family:monospace;font-size:12px}
.td-num{text-align:right;font-weight:600;color:var(--fg2,#444)}
.td-val{color:var(--fg2,#444);font-size:12px;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.td-size{text-align:right;color:var(--fg2,#888)}
dl.kv{display:grid;grid-template-columns:160px 1fr;gap:1px}
dl.kv dt{background:var(--th-bg,#f9f9f9);padding:6px 12px;font-size:12px;font-weight:500;color:var(--fg2,#555)}
dl.kv dd{padding:6px 12px;word-break:break-all}
.empty{padding:10px 12px;color:var(--fg2,#999);font-style:italic}
.err{background:#fff3f3;border:1px solid #f5c6c6;border-radius:6px;padding:10px 14px;color:#b00020;font-size:12px;margin-bottom:12px}
.nc4-note{background:#e8f5e9;border:1px solid #a5d6a7;border-radius:6px;padding:10px 14px;color:#1b5e20;font-size:12px;margin-bottom:12px}
body.fv-dark{--fg:#e6e6e6;--fg2:#aeb7c2;--bg:#1e1e1e;--bg2:#2d2d30;--panel:#252526;--border:#45464a;--th-bg:#2d2d30;--hover:#333438}
body.fv-dark .badge-ver{background:#122b45;color:#9dccff;border-color:#315b80}
body.fv-dark .td-type{color:#79c0ff}
body.fv-dark .err{background:#35171a;color:#ff938a;border-color:#7d3439}
body.fv-dark .nc4-note{background:#16351f;color:#a7e3b5;border-color:#397249}
`;

export function render(intake) {
  const b = intake.bytes;
  if (!b || b.length < 4) {
    return { bodyHtml: `<style>${STYLE}</style><div class="err">File too small.</div>` };
  }

  const fmtBytes = (n) => {
    if (!n) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  };

  // Check for NetCDF-4 (HDF5)
  if (b[0] === 0x89 && b[1] === 0x48 && b[2] === 0x44 && b[3] === 0x46) {
    return { bodyHtml: `<style>${STYLE}</style>
<div class="nc-header"><span class="badge badge-nc">NetCDF</span><span class="badge badge-ver">HDF5 / NetCDF-4</span><span class="badge badge-size">${esc(fmtBytes(intake.size))}</span></div>
<div class="nc4-note">This is a NetCDF-4 file (HDF5 container). Header metadata is not yet parseable in this viewer — only NetCDF-3 classic format is supported. Use ncdump or a scientific data tool to inspect the contents.</div>`,
    };
  }

  if (!(b[0] === 0x43 && b[1] === 0x44 && b[2] === 0x46 && (b[3] === 0x01 || b[3] === 0x02))) {
    return { bodyHtml: `<style>${STYLE}</style><div class="err">Not a NetCDF-3 file (missing CDF\\x01/\\x02 magic).</div>` };
  }

  let parsed;
  let parseError = null;
  try {
    parsed = parseNetcdfHeader(b);
  } catch (e) {
    parseError = e.message;
    parsed = { version: b[3], dimensions: [], globalAttrs: [], variables: [] };
  }

  const verLabel = parsed.version === 1 ? 'NetCDF-3 Classic' : 'NetCDF-3 64-bit Offset';

  let html = `<style>${STYLE}</style>`;

  html += `<div class="nc-header">`;
  html += `<span class="badge badge-nc">NetCDF</span>`;
  html += `<span class="badge badge-ver">${esc(verLabel)}</span>`;
  html += `<span class="badge badge-size">${esc(fmtBytes(intake.size))}</span>`;
  html += `</div>`;

  if (parseError) {
    html += `<div class="err">Parse error: ${esc(parseError)}</div>`;
  }

  // Global attributes (show key ones first)
  const KNOWN_ATTRS = ['title', 'institution', 'source', 'history', 'references',
    'Conventions', 'summary', 'comment', 'creator_name', 'creator_email'];
  const knownAttrs = [];
  const otherAttrs = [];
  for (const a of parsed.globalAttrs) {
    if (KNOWN_ATTRS.some((k) => k.toLowerCase() === a.name.toLowerCase())) {
      knownAttrs.push(a);
    } else {
      otherAttrs.push(a);
    }
  }
  const allAttrs = [...knownAttrs, ...otherAttrs];

  if (allAttrs.length > 0) {
    html += `<div class="sec"><div class="sec-title">Global Attributes (${allAttrs.length})</div><div class="card"><dl class="kv">`;
    for (const a of allAttrs) {
      html += `<dt>${esc(a.name)}</dt><dd>${esc(a.value)}</dd>`;
    }
    html += `</dl></div></div>`;
  }

  // Dimensions
  if (parsed.dimensions.length > 0) {
    html += `<div class="sec"><div class="sec-title">Dimensions (${parsed.dimensions.length})</div><div class="card">`;
    html += `<table><thead><tr><th>Name</th><th style="text-align:right">Size</th></tr></thead><tbody>`;
    for (const d of parsed.dimensions) {
      const sizeLabel = d.size === 'UNLIMITED' ? `<em>UNLIMITED</em>${parsed.numRecs > 0 ? ` (${parsed.numRecs} records)` : ''}` : String(d.size);
      html += `<tr><td>${esc(d.name)}</td><td class="td-size">${sizeLabel}</td></tr>`;
    }
    html += `</tbody></table></div></div>`;
  }

  // Variables
  if (parsed.variables.length > 0) {
    html += `<div class="sec"><div class="sec-title">Variables (${parsed.variables.length})</div><div class="card">`;
    html += `<table><thead><tr><th>Name</th><th>Type</th><th>Shape</th><th>Attributes</th></tr></thead><tbody>`;
    for (const v of parsed.variables) {
      const shape = v.dims.length > 0 ? `(${v.dims.join(', ')})` : 'scalar';
      const attrSummary = v.attrs.map((a) => `${a.name}: ${a.value.slice(0, 30)}`).join('; ').slice(0, 80) || '—';
      html += `<tr>`;
      html += `<td>${esc(v.name)}</td>`;
      html += `<td class="td-type">${esc(v.type)}</td>`;
      html += `<td class="td-dims">${esc(shape)}</td>`;
      html += `<td class="td-val" title="${esc(attrSummary)}">${esc(attrSummary)}</td>`;
      html += `</tr>`;
    }
    html += `</tbody></table></div></div>`;
  }

  if (parsed.dimensions.length === 0 && parsed.variables.length === 0 && parsed.globalAttrs.length === 0) {
    html += `<div class="empty" style="padding:16px">File appears empty or header could not be parsed.</div>`;
  }

  return { bodyHtml: html, hadUnsafe: false };
}
