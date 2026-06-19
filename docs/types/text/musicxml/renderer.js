const FIFTHS_MAP = {
  '-7': 'Cb major', '-6': 'Gb major', '-5': 'Db major', '-4': 'Ab major',
  '-3': 'Eb major', '-2': 'Bb major', '-1': 'F major',
  '0': 'C major',
  '1': 'G major', '2': 'D major', '3': 'A major', '4': 'E major',
  '5': 'B major', '6': 'F# major', '7': 'C# major',
};

function getText(doc, tag) {
  const el = doc.querySelector(tag);
  return el ? el.textContent.trim() : '';
}

export function parseMusicXml(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const parseErr = doc.querySelector('parsererror');
  if (parseErr) return null;
  const root = doc.documentElement;
  if (root.tagName !== 'score-partwise' && root.tagName !== 'score-timewise') return null;

  const title = getText(doc, 'movement-title') || getText(doc, 'work-title') || '';
  const composer = (() => {
    for (const c of doc.querySelectorAll('creator')) {
      if ((c.getAttribute('type') || '').toLowerCase() === 'composer') return c.textContent.trim();
    }
    return '';
  })();
  const lyricist = (() => {
    for (const c of doc.querySelectorAll('creator')) {
      if ((c.getAttribute('type') || '').toLowerCase() === 'lyricist') return c.textContent.trim();
    }
    return '';
  })();
  const copyright = getText(doc, 'rights');

  const partEls = doc.querySelectorAll('score-part');
  const parts = Array.from(partEls).map((p) => {
    const name = p.querySelector('part-name');
    return name ? name.textContent.trim() : (p.getAttribute('id') || '?');
  });

  const firstPart = doc.querySelector('part');
  const measures = firstPart ? firstPart.querySelectorAll('measure').length : 0;

  const timeEl = doc.querySelector('time');
  const beats = timeEl ? getText(timeEl, 'beats') : '';
  const beatType = timeEl ? getText(timeEl, 'beat-type') : '';
  const timeSig = beats && beatType ? `${beats}/${beatType}` : '';

  const keyEl = doc.querySelector('key');
  const fifths = keyEl ? getText(keyEl, 'fifths') : '';
  const key = FIFTHS_MAP[fifths] || (fifths !== '' ? `${fifths} fifths` : '');

  let tempo = '';
  const soundEl = doc.querySelector('sound[tempo]');
  if (soundEl) {
    tempo = soundEl.getAttribute('tempo') + ' BPM';
  } else {
    const perMin = getText(doc, 'per-minute');
    if (perMin) tempo = perMin + ' BPM';
  }

  const version = root.getAttribute('version') || '';

  return { title, composer, lyricist, copyright, parts, measures, timeSig, key, tempo, version };
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function getMxlXml(intake) {
  try {
    const { default: JSZip } = await import('../../../vendor/jszip/jszip.min.js');
    const zip = await JSZip.loadAsync(intake.bytes);
    let xmlFile = null;
    const container = zip.file('META-INF/container.xml');
    if (container) {
      const cText = await container.async('text');
      const m = cText.match(/full-path="([^"]+\.xml)"/i);
      if (m) xmlFile = zip.file(m[1]);
    }
    if (!xmlFile) {
      for (const name of Object.keys(zip.files)) {
        if (name.endsWith('.xml') && !name.includes('/')) { xmlFile = zip.files[name]; break; }
      }
    }
    if (!xmlFile) return null;
    return await xmlFile.async('text');
  } catch {
    return null;
  }
}

export async function render(intake, _ctx) {
  let xmlText = intake.text || '';
  const isMxl = (intake.filename || '').toLowerCase().endsWith('.mxl') ||
    (intake.bytes && intake.bytes[0] === 0x50 && intake.bytes[1] === 0x4b);

  if (isMxl) {
    const extracted = await getMxlXml(intake);
    if (!extracted) {
      return { hadUnsafe: false, bodyHtml: '<div class="mxml-preview"><div class="mxml-header"><p>Compressed MusicXML (.mxl) — could not extract XML content. View raw to inspect.</p></div></div>' };
    }
    xmlText = extracted;
  }

  const info = parseMusicXml(xmlText);
  if (!info) {
    return { hadUnsafe: false, bodyHtml: '<div class="mxml-preview"><div class="mxml-header"><p class="mxml-error">Not a valid MusicXML file — no &lt;score-partwise&gt; or &lt;score-timewise&gt; root found.</p></div></div>' };
  }

  const headerHtml = '<div class="mxml-header">'
    + (info.title ? '<div class="mxml-title">' + esc(info.title) + '</div>' : '')
    + (info.composer ? '<div class="mxml-composer">' + esc(info.composer) + '</div>' : '')
    + (info.lyricist ? '<div class="mxml-lyricist">Lyrics: ' + esc(info.lyricist) + '</div>' : '')
    + (info.copyright ? '<div class="mxml-copyright">' + esc(info.copyright) + '</div>' : '')
    + (!info.title && !info.composer ? '<div class="mxml-untitled">Untitled Score</div>' : '')
    + '</div>';

  const partsHtml = info.parts.length
    ? '<div class="mxml-section"><div class="mxml-label">Instrumentation (' + info.parts.length + ')</div>'
      + '<div class="mxml-parts">' + info.parts.map((p) => '<span class="mxml-part-chip">' + esc(p) + '</span>').join('') + '</div></div>'
    : '';

  const stats = [];
  if (info.measures) stats.push({ label: 'Measures', value: info.measures });
  if (info.parts.length) stats.push({ label: 'Parts', value: info.parts.length });
  if (info.timeSig) stats.push({ label: 'Time', value: info.timeSig });
  if (info.key) stats.push({ label: 'Key', value: info.key });
  if (info.tempo) stats.push({ label: 'Tempo', value: info.tempo });
  if (info.version) stats.push({ label: 'MusicXML', value: 'v' + info.version });

  const statsHtml = stats.length
    ? '<div class="mxml-section"><div class="mxml-label">Score Details</div><div class="mxml-stats">'
      + stats.map((s) => '<div class="mxml-stat"><div class="mxml-stat-value">' + esc(String(s.value)) + '</div><div class="mxml-stat-label">' + esc(s.label) + '</div></div>').join('')
      + '</div></div>'
    : '';

  return { hadUnsafe: false, bodyHtml: '<div class="mxml-preview">' + headerHtml + partsHtml + statsHtml + '</div>' };
}
