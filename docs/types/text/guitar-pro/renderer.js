function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

const GP_NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// Instrument category from MIDI program (0-indexed)
function midiInstrCategory(prog) {
  if (prog < 8) return 'Piano';
  if (prog < 16) return 'Chromatic Perc';
  if (prog < 24) return 'Organ';
  if (prog < 32) return 'Guitar';
  if (prog < 40) return 'Bass';
  if (prog < 48) return 'Strings';
  if (prog < 56) return 'Ensemble';
  if (prog < 64) return 'Brass';
  if (prog < 72) return 'Reed';
  if (prog < 80) return 'Pipe';
  if (prog < 88) return 'Synth Lead';
  if (prog < 96) return 'Synth Pad';
  if (prog < 104) return 'Synth FX';
  if (prog < 112) return 'Ethnic';
  if (prog < 120) return 'Percussive';
  return 'Sound FX';
}

async function parseGpx(bytes) {
  // GPX is a ZIP — use jszip if available, else just show basics
  const { JSZip } = await import('../../../../vendor/jszip/jszip.min.js');
  const zip = await JSZip.loadAsync(bytes);
  const scoreFile = zip.file('Content/score.gpif') || zip.file('score.gpif');
  if (!scoreFile) return { format: 'Guitar Pro 6/7 (GPX)', error: 'No score.gpif found in ZIP' };

  const xml = await scoreFile.async('string');
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');

  const get = (tag) => doc.querySelector(tag)?.textContent?.trim() || null;
  const getAll = (tag) => [...doc.querySelectorAll(tag)];

  const title = get('Title') || get('title');
  const artist = get('Artist') || get('artist');
  const album = get('Album') || get('album');
  const tempo = get('Tempo') || get('tempo');

  const tracks = getAll('Track');
  const trackNames = tracks.map((t) => t.querySelector('Name')?.textContent?.trim() || 'Track').slice(0, 10);

  const masterBars = getAll('MasterBar').length;

  return { format: 'Guitar Pro 6/7 (GPX)', title, artist, album, tempo, trackNames, measures: masterBars };
}

function parseGpBinary(bytes) {
  // Read length-prefixed string
  function readStr(pos) {
    if (pos >= bytes.length) return ['', pos];
    const len = bytes[pos];
    const str = String.fromCharCode(...bytes.slice(pos + 1, pos + 1 + len));
    return [str, pos + 1 + len];
  }
  // Check magic header
  const head = String.fromCharCode(...bytes.slice(0, 35));
  const ver = head.match(/FICHIER GUITAR PRO v(\d+\.\d+)/)?.[1] || head.match(/FICHIER GUITAR PRO v(\d+)/)?.[1];
  const major = parseInt(ver);

  // Skip to title: after version string (fixed 31 bytes in GP5, variable in GP3/4)
  let pos = 31;
  // In GP3/4/5 the first bytes after the header are the number of measures & tracks
  // But we just want the title which is typically at a fixed offset
  // Skip the version block (31 bytes header magic slot in GP5)
  const [title, p1] = readStr(pos);
  const [subtitle, p2] = readStr(p1);
  const [artist, p3] = readStr(p2);
  const [album, p4] = readStr(p3);

  return {
    format: `Guitar Pro ${ver ? 'v'+ver : (major >= 5 ? '5' : major >= 4 ? '4' : '3')}`,
    title: title || null, subtitle: subtitle || null,
    artist: artist || null, album: album || null,
  };
}

export async function render(intake) {
  const b = intake.bytes;
  if (!b || b.length < 4) {
    return { bodyHtml: '<div class="gp-preview"><p class="gp-note">Too small to parse.</p></div>' };
  }

  let info;
  // GPX = ZIP (PK magic)
  if (b[0] === 0x50 && b[1] === 0x4b) {
    try {
      info = await parseGpx(b);
    } catch (e) {
      info = { format: 'Guitar Pro 6/7 (GPX)', error: 'Could not parse: ' + e.message };
    }
  } else {
    try {
      info = parseGpBinary(b);
    } catch (e) {
      info = { format: 'Guitar Pro', error: 'Could not parse binary: ' + e.message };
    }
  }

  const { format, error, title, artist, album, tempo, trackNames, measures } = info;

  const badge = `<span class="gp-badge">GP</span>`;
  const subtitle = `<span class="gp-format">${esc(format)}</span>`;

  if (error) {
    return { bodyHtml: `<div class="gp-preview"><div class="gp-header">${badge}${subtitle}</div><p class="gp-note">${esc(error)}</p></div>` };
  }

  function row(label, value) {
    if (!value) return '';
    return `<tr><td class="gp-key">${esc(label)}</td><td>${esc(value)}</td></tr>`;
  }

  const metaRows = [
    row('Title', title),
    row('Artist', artist),
    row('Album', album),
    row('Tempo', tempo ? tempo + ' BPM' : null),
    row('Measures', measures ? String(measures) : null),
  ].filter(Boolean).join('');

  const trackChips = trackNames?.length
    ? `<div class="gp-section">
        <div class="gp-label">Tracks (${trackNames.length})</div>
        <div class="gp-chips">${trackNames.map((t) => `<span class="gp-chip">${esc(t)}</span>`).join('')}</div>
      </div>`
    : '';

  return { bodyHtml: `<div class="gp-preview">
  <div class="gp-header">${badge}${subtitle}</div>
  ${metaRows ? `<table class="gp-table">${metaRows}</table>` : ''}
  ${trackChips}
</div>` };
}
