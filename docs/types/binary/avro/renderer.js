// Apache Avro Object Container File format reader
// Magic: 'Obj\x01' (4 bytes)
// Header: Avro map (string→bytes) with 'avro.schema' and 'avro.codec' entries
// Avro encoding uses variable-length zigzag integers for map/array sizes

function readVarInt(b, off) {
  let result = 0, shift = 0;
  while (off < b.length) {
    const byte = b[off++];
    result |= (byte & 0x7f) << shift;
    shift += 7;
    if ((byte & 0x80) === 0) break;
  }
  // Zigzag decode (Avro uses zigzag for int/long)
  const decoded = (result >>> 1) ^ -(result & 1);
  return { val: decoded, next: off };
}

function readAvroMap(b, off) {
  // Avro map: blocks of (count:long, key:string, value:bytes)... ending with count=0
  const entries = {};
  while (off < b.length) {
    const { val: blockCount, next: n1 } = readVarInt(b, off);
    off = n1;
    if (blockCount === 0) break;
    const count = Math.abs(blockCount);
    // If blockCount < 0, block size follows (skip it)
    if (blockCount < 0) {
      const { next: n2 } = readVarInt(b, off);
      off = n2;
    }
    for (let i = 0; i < count && off < b.length; i++) {
      // Key (string): length:varint + bytes
      const { val: keyLen, next: n3 } = readVarInt(b, off);
      off = n3;
      const key = new TextDecoder('utf-8', { fatal: false }).decode(b.slice(off, off + keyLen));
      off += keyLen;
      // Value (bytes): length:varint + bytes
      const { val: valLen, next: n4 } = readVarInt(b, off);
      off = n4;
      const val = b.slice(off, off + Math.abs(valLen));
      entries[key] = val;
      off += Math.abs(valLen);
    }
  }
  return { entries, next: off };
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function prettySchema(schema) {
  try {
    return JSON.parse(schema);
  } catch {
    return null;
  }
}

function renderSchemaField(field, depth = 0) {
  if (!field || typeof field !== 'object') return esc(String(field));
  const name = field.name || '(unnamed)';
  const type = Array.isArray(field.type)
    ? field.type.filter((t) => t !== 'null').join(' | ')
    : String(field.type);
  return `<div class="avro-field" style="margin-left:${depth * 1.2}rem">
    <span class="avro-field-name">${esc(name)}</span>
    <span class="avro-field-type">${esc(type)}</span>
    ${field.doc ? `<span class="avro-field-doc">${esc(field.doc)}</span>` : ''}
  </div>`;
}

export function render(intake) {
  const b = intake.bytes;
  if (!b || b.length < 4) {
    return { bodyHtml: '<p class="viewer-message">Not a valid Avro file.</p>', hadUnsafe: false };
  }
  if (String.fromCharCode(b[0], b[1], b[2]) !== 'Obj' || b[3] !== 1) {
    return { bodyHtml: '<p class="viewer-message">Missing Avro magic bytes.</p>', hadUnsafe: false };
  }

  let headerEntries = {};
  let headerNext = 4;
  try {
    const result = readAvroMap(b, 4);
    headerEntries = result.entries;
    headerNext = result.next;
  } catch (e) {
    // Partial parse ok
  }

  const schemaBytes = headerEntries['avro.schema'];
  const codecBytes = headerEntries['avro.codec'];
  const schemaText = schemaBytes ? new TextDecoder('utf-8', { fatal: false }).decode(schemaBytes) : null;
  const codec = codecBytes ? new TextDecoder('utf-8', { fatal: false }).decode(codecBytes) : 'null';

  const parsed = schemaText ? prettySchema(schemaText) : null;
  const schemaType = parsed?.type || 'unknown';
  const schemaName = parsed?.name || parsed?.namespace ? `${parsed.namespace || ''}.${parsed.name || ''}`.replace(/^\./, '') : null;
  const fields = parsed?.fields || [];

  const metaRows = [
    ['Format', 'Apache Avro (Object Container)'],
    ['File size', `${b.length.toLocaleString()} bytes`],
    ['Codec', codec || 'null'],
    schemaType !== 'unknown' ? ['Schema type', schemaType] : null,
    schemaName ? ['Schema name', schemaName] : null,
    fields.length ? ['Field count', String(fields.length)] : null,
  ].filter(Boolean).map(([k, v]) => `<div class="meta-row"><span class="meta-key">${esc(k)}</span><span class="meta-val">${esc(v)}</span></div>`).join('');

  let schemaHtml = '';
  if (fields.length > 0) {
    const fieldHtml = fields.slice(0, 30).map((f) => renderSchemaField(f)).join('');
    const more = fields.length > 30 ? `<p class="viewer-note">+${fields.length - 30} more fields not shown.</p>` : '';
    schemaHtml = `
      <div class="meta-section">
        <h4 class="meta-section-title">Schema Fields</h4>
        <div class="avro-fields">${fieldHtml}</div>
        ${more}
      </div>`;
  } else if (schemaText) {
    // Show raw schema (truncated)
    const display = schemaText.length > 500 ? schemaText.slice(0, 500) + '…' : schemaText;
    schemaHtml = `
      <div class="meta-section">
        <h4 class="meta-section-title">Schema (raw)</h4>
        <pre class="avro-schema-raw">${esc(display)}</pre>
      </div>`;
  }

  return {
    bodyHtml: `
      <style>
        .badge-avro { background: #d32f2f; color: #fff; }
        .avro-fields { font-size: 0.85rem; }
        .avro-field { display: flex; gap: 0.5rem; padding: 0.15rem 0; border-bottom: 1px solid var(--border,#eee); align-items: baseline; }
        .avro-field-name { font-family: monospace; color: var(--accent,#1976d2); min-width: 8rem; font-weight: 600; }
        .avro-field-type { color: #e65100; font-family: monospace; }
        .avro-field-doc { color: #888; font-style: italic; font-size: 0.8rem; }
        .avro-schema-raw { font-size: 0.75rem; background: var(--bg2,#f5f5f5); padding: 0.5rem; border-radius: 4px; overflow: auto; white-space: pre-wrap; }
      </style>
      <div class="badge-row"><span class="badge badge-avro">Apache Avro</span></div>
      <div class="meta-section">
        <h4 class="meta-section-title">File Info</h4>
        ${metaRows}
      </div>
      ${schemaHtml}
      <p class="viewer-note">Data records not decoded — use avro-tools or Apache Spark to read the full dataset.</p>`,
    hadUnsafe: false,
  };
}
