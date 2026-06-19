async function getXml(b) {
  let bytes = b;
  if (b[0] === 0x1f && b[1] === 0x8b) {
    try {
      const ds = new DecompressionStream('gzip');
      const w = ds.writable.getWriter(); w.write(b); w.close();
      const chunks = []; const r = ds.readable.getReader();
      while (true) { const { done, value } = await r.read(); if (done) break; chunks.push(value); }
      const total = chunks.reduce((n, c) => n + c.length, 0);
      bytes = new Uint8Array(total); let off = 0;
      for (const c of chunks) { bytes.set(c, off); off += c.length; }
    } catch { return null; }
  }
  try { return new TextDecoder('utf-8', { fatal: false }).decode(bytes); } catch { return null; }
}

export async function metadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 4) return {};
  const xml = await getXml(b);
  if (!xml) return {};
  const m = xml.match(/<head[^>]+bpm="([^"]+)"/);
  const v = xml.match(/creatorversion="([^"]+)"/);
  return { format: 'LMMS Project', bpm: m ? m[1] : undefined, lmmsVersion: v ? v[1] : undefined };
}
