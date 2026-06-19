function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function getXmlDoc(b) {
  let xmlBytes = b;
  if (b[0] === 0x1f && b[1] === 0x8b) {
    try {
      const ds = new DecompressionStream('gzip');
      const writer = ds.writable.getWriter();
      writer.write(b);
      writer.close();
      const chunks = [];
      const reader = ds.readable.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const total = chunks.reduce((n, c) => n + c.length, 0);
      xmlBytes = new Uint8Array(total);
      let off = 0;
      for (const c of chunks) { xmlBytes.set(c, off); off += c.length; }
    } catch { return null; }
  }
  try {
    const xml = new TextDecoder('utf-8', { fatal: false }).decode(xmlBytes);
    return new DOMParser().parseFromString(xml, 'text/xml');
  } catch { return null; }
}

export async function render(intake) {
  const b = intake.bytes;
  if (!b || b.length < 4) {
    return { bodyHtml: '<p class="viewer-message">File too small.</p>', hadUnsafe: false };
  }

  const isGzip = b[0] === 0x1f && b[1] === 0x8b;
  const doc = await getXmlDoc(b);
  if (!doc) {
    return { bodyHtml: '<p class="viewer-message">Could not parse LMMS project file.</p>', hadUnsafe: false };
  }

  const proj = doc.querySelector('lmms-project');
  if (!proj) {
    return { bodyHtml: '<p class="viewer-message">Not an LMMS project file (missing &lt;lmms-project&gt; root).</p>', hadUnsafe: false };
  }

  const version = proj.getAttribute('version') || '';
  const type = proj.getAttribute('type') || '';
  const creator = proj.getAttribute('creator') || 'LMMS';
  const creatorVersion = proj.getAttribute('creatorversion') || '';

  const head = proj.querySelector('head');
  const bpm = head ? head.getAttribute('bpm') : null;
  const masterVol = head ? head.getAttribute('mastervol') : null;
  const timeSigNum = head ? head.getAttribute('timesig_numerator') : null;
  const timeSigDen = head ? head.getAttribute('timesig_denominator') : null;
  const name = head ? head.getAttribute('name') : null;

  // Count tracks
  const song = proj.querySelector('song');
  const tracks = song ? song.querySelectorAll('track') : [];
  let bbTracks = 0, instrTracks = 0, sampleTracks = 0, autoTracks = 0;
  const instruments = [];
  for (const t of tracks) {
    const ttype = t.getAttribute('type') || '';
    if (ttype === '0') instrTracks++;
    else if (ttype === '1') bbTracks++;
    else if (ttype === '2') sampleTracks++;
    else if (ttype === '3') autoTracks++;
    const instr = t.querySelector('instrumenttrack');
    if (instr) {
      const iname = t.getAttribute('name') || '';
      if (iname && instruments.length < 20) instruments.push(iname);
    }
  }

  const rows = [
    ['Format', 'LMMS Project'],
    name ? ['Song name', name] : null,
    bpm ? ['BPM', bpm] : null,
    (timeSigNum && timeSigDen) ? ['Time signature', `${timeSigNum}/${timeSigDen}`] : null,
    masterVol ? ['Master volume', `${masterVol}%`] : null,
    tracks.length > 0 ? ['Tracks', `${tracks.length} (${instrTracks} instrument, ${bbTracks} beat+bassline, ${sampleTracks} sample, ${autoTracks} automation)`] : null,
    creatorVersion ? ['LMMS version', creatorVersion] : null,
    version ? ['Project format', version] : null,
    ['File type', isGzip ? 'Compressed (.mmpz)' : 'Uncompressed (.mmp)'],
    ['File size', `${b.length.toLocaleString()} bytes`],
  ].filter(Boolean).map(([k, v]) =>
    `<div class="meta-row"><span class="meta-key">${esc(k)}</span><span class="meta-val">${esc(v)}</span></div>`
  ).join('');

  let trackTable = '';
  if (instruments.length > 0) {
    const rows2 = instruments.map((n, i) =>
      `<tr><td>${i + 1}</td><td>${esc(n)}</td></tr>`
    ).join('');
    trackTable = `
      <div class="meta-section">
        <h4 class="meta-section-title">Instrument Tracks</h4>
        <table class="meta-table">
          <thead><tr><th>#</th><th>Name</th></tr></thead>
          <tbody>${rows2}</tbody>
        </table>
      </div>`;
  }

  return {
    bodyHtml: `
      <style>.badge-lmms { background: #00897b; color: #fff; }</style>
      <div class="badge-row"><span class="badge badge-lmms">LMMS</span></div>
      <div class="meta-section">
        <h4 class="meta-section-title">Project Info</h4>
        ${rows}
      </div>
      ${trackTable}`,
    hadUnsafe: false,
  };
}
