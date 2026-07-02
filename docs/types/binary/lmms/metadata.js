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
  const head = xml.match(/<head\b([^>]*)\/?>/i)?.[1] || '';
  const root = xml.match(/<lmms-project\b([^>]*)>/i)?.[1] || '';
  const attr = (source, name) => source.match(new RegExp(`${name}="([^"]*)"`))?.[1];
  const trackTypes = [...xml.matchAll(/<track\b([^>]*)>/gi)].map((m) => attr(m[1], 'type') || '');
  const count = (type) => trackTypes.filter((t) => t === type).length;
  const out = {
    Format: 'LMMS Project',
    BPM: attr(head, 'bpm'),
    'Song name': attr(head, 'name'),
    'Time signature': attr(head, 'timesig_numerator') && attr(head, 'timesig_denominator')
      ? `${attr(head, 'timesig_numerator')}/${attr(head, 'timesig_denominator')}`
      : undefined,
    'Master volume': attr(head, 'mastervol') ? `${attr(head, 'mastervol')}%` : undefined,
    'Master pitch': attr(head, 'masterpit'),
    Tracks: trackTypes.length ? String(trackTypes.length) : undefined,
    'Instrument tracks': count('0') ? String(count('0')) : undefined,
    'Beat+bassline tracks': count('1') ? String(count('1')) : undefined,
    'Sample tracks': count('2') ? String(count('2')) : undefined,
    'Automation tracks': count('3') ? String(count('3')) : undefined,
    'LMMS version': attr(root, 'creatorversion'),
    'Project format': attr(root, 'version'),
  };
  return Object.fromEntries(Object.entries(out).filter(([, value]) => value !== undefined && value !== ''));
}
