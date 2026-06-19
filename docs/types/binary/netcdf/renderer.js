function esc(s) { return String(s ?? '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

// NetCDF-3 (CDF\x01 / CDF\x02) binary header parser
// Spec: https://docs.unidata.ucar.edu/nug/current/file_format_specifications.html

function readU32BE(b, off) {
  return ((b[off] << 24) | (b[off+1] << 16) | (b[off+2] << 8) | b[off+3]) >>> 0;
}
function readI32BE(b, off) {
  return (b[off] << 24) | (b[off+1] << 16) | (b[off+2] << 8) | b[off+3];
}
function readF32BE(b, off) {
  const dv = new DataView(b.buffer ?? b.slice(off, off+4).buffer);
  return dv.getFloat32(off + (b.buffer ? b.byteOffset : 0), false);
}
function readF64BE(b, off) {
  const dv = new DataView(b.buffer ?? b.slice(off, off+8).buffer);
  return dv.getFloat64(off + (b.buffer ? b.byteOffset : 0), false);
}

const NC_TYPE_NAMES = {1:'byte', 2:'char', 3:'short', 4:'int', 5:'float', 6:'double'};
const NC_TYPE_SIZES = {1:1, 2:1, 3:2, 4:4, 5:4, 6:8};

function pad4(n) { return n + (4 - n % 4) % 4; }

function parseName(b, pos) {
  const len = readU32BE(b, pos); pos += 4;
  const str = new TextDecoder().decode(b.slice(pos, pos + len));
  pos += pad4(len);
  return { str, pos };
}

function parseValues(b, pos, ncType, nelems) {
  const typeSize = NC_TYPE_SIZES[ncType] || 1;
  const totalBytes = nelems * typeSize;
  const values = [];
  for (let i = 0; i < nelems; i++) {
    const vpos = pos + i * typeSize;
    switch (ncType) {
      case 1: values.push(b[vpos]); break;
      case 2: values.push(String.fromCharCode(b[vpos])); break;
      case 3: values.push(readI32BE(b, vpos) << 16 >> 16); break;
      case 4: values.push(readI32BE(b, vpos)); break;
      case 5: try { values.push(readF32BE(b, vpos)); } catch { values.push(0); } break;
      case 6: try { values.push(readF64BE(b, vpos)); } catch { values.push(0); } break;
      default: values.push(0);
    }
  }
  pos += pad4(totalBytes);
  // For char type, join into string
  const displayValue = ncType === 2
    ? values.join('').replace(/\0/g, '').trim()
    : values.slice(0, 8).map((v) => typeof v === 'number' ? Number(v.toPrecision(6)) : v).join(', ')
      + (values.length > 8 ? ', …' : '');
  return { displayValue, pos };
}

function parseAttList(b, pos) {
  const attrs = [];
  if (pos + 8 > b.length) return { attrs, pos };
  const tag = readU32BE(b, pos); pos += 4;
  if (tag === 0) { pos += 4; return { attrs, pos }; } // ABSENT: 0x00000000 0x00000000
  if (tag !== 0x0C) return { attrs, pos: pos - 4 };  // NC_ATTRIBUTE = 0x0C
  const nelems = readU32BE(b, pos); pos += 4;
  for (let i = 0; i < nelems && pos < b.length - 8; i++) {
    const { str: name, pos: p1 } = parseName(b, pos); pos = p1;
    if (pos + 8 > b.length) break;
    const ncType = readU32BE(b, pos); pos += 4;
    const count  = readU32BE(b, pos); pos += 4;
    const { displayValue, pos: p2 } = parseValues(b, pos, ncType, count); pos = p2;
    attrs.push({ name, type: NC_TYPE_NAMES[ncType] || String(ncType), value: displayValue });
  }
  return { attrs, pos };
}

function parseHeader(bytes) {
  if (bytes.length < 8) throw new Error('Too short');
  const version = bytes[3]; // 1=classic, 2=64-bit
  const is64 = version === 2;
  const result = { version, dimensions: [], globalAttrs: [], variables: [] };

  let pos = 4;
  result.numRecs = readU32BE(bytes, pos); pos += 4;

  // dim_list
  if (pos + 8 > bytes.length) return result;
  const dimTag = readU32BE(bytes, pos); pos += 4;
  if (dimTag !== 0) {
    const ndims = readU32BE(bytes, pos); pos += 4;
    for (let i = 0; i < ndims && pos < bytes.length - 8; i++) {
      const { str: name, pos: p1 } = parseName(bytes, pos); pos = p1;
      const size = readU32BE(bytes, pos); pos += 4;
      result.dimensions.push({ name, size: size === 0 ? 'UNLIMITED' : size });
    }
  } else {
    pos += 4; // skip ABSENT second word
  }

  // att_list (global)
  const { attrs, pos: p2 } = parseAttList(bytes, pos); pos = p2;
  result.globalAttrs = attrs;

  // var_list
  if (pos + 8 > bytes.length) return result;
  const varTag = readU32BE(bytes, pos); pos += 4;
  if (varTag !== 0) {
    const nvars = readU32BE(bytes, pos); pos += 4;
    for (let i = 0; i < nvars && pos < bytes.length - 8 && i < 100; i++) {
      const { str: name, pos: p1 } = parseName(bytes, pos); pos = p1;
      if (pos + 4 > bytes.length) break;
      const ndimids = readU32BE(bytes, pos); pos += 4;
      const dimids = [];
      for (let d = 0; d < ndimids; d++) {
        if (pos + 4 > bytes.length) break;
        dimids.push(readU32BE(bytes, pos)); pos += 4;
      }
      // Variable attributes
      const { attrs: varAttrs, pos: p3 } = parseAttList(bytes, pos); pos = p3;
      if (pos + 4 > bytes.length) break;
      const ncType = readU32BE(bytes, pos); pos += 4;
      const vsize  = readU32BE(bytes, pos); pos += 4;
      // begin offset: 4 bytes (classic) or 8 bytes (64-bit)
      pos += is64 ? 8 : 4;

      const dimNames = dimids.map((id) => result.dimensions[id]?.name ?? String(id));
      result.variables.push({
        name,
        type: NC_TYPE_NAMES[ncType] || String(ncType),
        dims: dimNames,
        attrs: varAttrs,
      });
    }
  }

  return result;
}

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
    parsed = parseHeader(b);
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
