function readVarInt(b, off) {
  let result = 0, shift = 0;
  while (off < b.length) {
    const byte = b[off++];
    result |= (byte & 0x7f) << shift;
    shift += 7;
    if ((byte & 0x80) === 0) break;
  }
  return { val: (result >>> 1) ^ -(result & 1), next: off };
}

export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 4) return {};
  if (String.fromCharCode(b[0], b[1], b[2]) !== 'Obj' || b[3] !== 1) return {};

  const result = { Format: 'Apache Avro', 'File Size': `${b.length} bytes` };

  try {
    let off = 4;
    while (off < b.length) {
      const { val: cnt, next: n1 } = readVarInt(b, off); off = n1;
      if (cnt === 0) break;
      const count = Math.abs(cnt);
      if (cnt < 0) { const { next: n } = readVarInt(b, off); off = n; }
      for (let i = 0; i < count && off < b.length; i++) {
        const { val: kl, next: nk } = readVarInt(b, off); off = nk;
        const key = new TextDecoder().decode(b.slice(off, off + kl)); off += kl;
        const { val: vl, next: nv } = readVarInt(b, off); off = nv;
        const vlen = Math.abs(vl);
        if (key === 'avro.codec') result['Codec'] = new TextDecoder().decode(b.slice(off, off + vlen));
        if (key === 'avro.schema') {
          const schema = JSON.parse(new TextDecoder().decode(b.slice(off, off + vlen)));
          if (schema.name) result['Schema'] = schema.namespace ? `${schema.namespace}.${schema.name}` : schema.name;
          if (schema.type) result['Type'] = schema.type;
          if (schema.fields) result['Fields'] = String(schema.fields.length);
        }
        off += vlen;
      }
    }
  } catch {}

  return result;
}
