const GM = ['Acoustic Grand Piano','Bright Acoustic Piano','Electric Grand Piano','Honky-tonk Piano','Electric Piano 1','Electric Piano 2','Harpsichord','Clavi','Celesta','Glockenspiel','Music Box','Vibraphone','Marimba','Xylophone','Tubular Bells','Dulcimer','Drawbar Organ','Percussive Organ','Rock Organ','Church Organ','Reed Organ','Accordion','Harmonica','Tango Accordion','Acoustic Guitar (nylon)','Acoustic Guitar (steel)','Electric Guitar (jazz)','Electric Guitar (clean)','Electric Guitar (muted)','Overdriven Guitar','Distortion Guitar','Guitar harmonics','Acoustic Bass','Electric Bass (finger)','Electric Bass (pick)','Fretless Bass','Slap Bass 1','Slap Bass 2','Synth Bass 1','Synth Bass 2','Violin','Viola','Cello','Contrabass','Tremolo Strings','Pizzicato Strings','Orchestral Harp','Timpani','String Ensemble 1','String Ensemble 2','SynthStrings 1','SynthStrings 2','Choir Aahs','Voice Oohs','Synth Voice','Orchestra Hit','Trumpet','Trombone','Tuba','Muted Trumpet','French Horn','Brass Section','SynthBrass 1','SynthBrass 2','Soprano Sax','Alto Sax','Tenor Sax','Baritone Sax','Oboe','English Horn','Bassoon','Clarinet','Piccolo','Flute','Recorder','Pan Flute','Blown Bottle','Shakuhachi','Whistle','Ocarina','Lead 1 (square)','Lead 2 (sawtooth)','Lead 3 (calliope)','Lead 4 (chiff)','Lead 5 (charang)','Lead 6 (voice)','Lead 7 (fifths)','Lead 8 (bass + lead)','Pad 1 (new age)','Pad 2 (warm)','Pad 3 (polysynth)','Pad 4 (choir)','Pad 5 (bowed)','Pad 6 (metallic)','Pad 7 (halo)','Pad 8 (sweep)','FX 1 (rain)','FX 2 (soundtrack)','FX 3 (crystal)','FX 4 (atmosphere)','FX 5 (brightness)','FX 6 (goblins)','FX 7 (echoes)','FX 8 (sci-fi)','Sitar','Banjo','Shamisen','Koto','Kalimba','Bag pipe','Fiddle','Shanai','Tinkle Bell','Agogo','Steel Drums','Woodblock','Taiko Drum','Melodic Tom','Synth Drum','Reverse Cymbal','Guitar Fret Noise','Breath Noise','Seashore','Bird Tweet','Telephone Ring','Helicopter','Applause','Gunshot'];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const u16 = (b, o) => (b[o] << 8) | b[o + 1];
const u32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const str = (b, o, n) => String.fromCharCode(...b.slice(o, o + n));

function vlq(b, p) {
  let v = 0, n = 0;
  do { if (p >= b.length) throw new Error('Unexpected end of MIDI track'); n = b[p++]; v = (v << 7) | (n & 0x7f); } while (n & 0x80);
  return { v, p };
}

export function parseMidi(intake) {
  const b = intake.bytes || new Uint8Array();
  if (b.length < 14 || str(b, 0, 4) !== 'MThd') throw new Error('Missing MThd header');
  const format = u16(b, 8), declaredTracks = u16(b, 10), division = u16(b, 12);
  const ppqn = division & 0x8000 ? 0 : division;
  const tempos = [], signatures = [], pitches = new Set();
  let totalNotes = 0, maxTick = 0, p = 8 + u32(b, 4), trackIndex = 0;
  const tracks = [];
  while (p + 8 <= b.length && trackIndex < declaredTracks) {
    if (str(b, p, 4) !== 'MTrk') break;
    const end = p + 8 + u32(b, p + 4);
    p += 8;
    const t = { name: '', instrumentName: '', channel: null, program: null, notes: 0 };
    let tick = 0, running = 0;
    while (p < end) {
      const d = vlq(b, p); tick += d.v; p = d.p; maxTick = Math.max(maxTick, tick);
      let status = b[p++];
      if (status < 0x80) { p--; status = running; } else if (status < 0xf0) running = status;
      if (status === 0xff) {
        const type = b[p++], len = vlq(b, p); p = len.p;
        const data = b.slice(p, p + len.v); p += len.v;
        if (type === 0x03) t.name = new TextDecoder().decode(data);
        else if (type === 0x04) t.instrumentName = new TextDecoder().decode(data);
        else if (type === 0x51 && data.length >= 3) {
          const micros = (data[0] << 16) | (data[1] << 8) | data[2];
          if (micros > 0) tempos.push({ tick, micros, order: tempos.length });
        }
        else if (type === 0x58 && data.length >= 2) signatures.push(data[0] + '/' + (1 << data[1]));
        continue;
      }
      if (status === 0xf0 || status === 0xf7) { const len = vlq(b, p); p = len.p + len.v; continue; }
      const op = status & 0xf0, ch = (status & 0x0f) + 1;
      t.channel ||= ch;
      const a = b[p++], needsTwo = ![0xc0, 0xd0].includes(op), c = needsTwo ? b[p++] : 0;
      if (op === 0x90 && c > 0) { totalNotes++; t.notes++; pitches.add(a); }
      else if (op === 0xc0) t.program = a;
    }
    tracks.push(t);
    p = end; trackIndex++;
  }
  const bpmValues = tempos.length ? tempos.map(({ micros }) => Math.round(60000000 / micros)) : [120];
  const bpmText = Math.min(...bpmValues) === Math.max(...bpmValues) ? String(bpmValues[0]) : Math.min(...bpmValues) + '-' + Math.max(...bpmValues);
  let seconds = 0;
  if (ppqn) {
    let priorTick = 0;
    let microsPerQuarter = 500000;
    for (const tempo of [...tempos].sort((a, b) => a.tick - b.tick || a.order - b.order)) {
      const tick = Math.min(maxTick, tempo.tick);
      if (tick >= priorTick) {
        seconds += (tick - priorTick) / ppqn * microsPerQuarter / 1000000;
        priorTick = tick;
        microsPerQuarter = tempo.micros;
      }
      if (tempo.tick > maxTick) break;
    }
    seconds += (maxTick - priorTick) / ppqn * microsPerQuarter / 1000000;
  }
  return { format, declaredTracks, ppqn, bpmText, timeSignature: signatures[0] || '4/4', durationSeconds: seconds, tracks, totalNotes, uniquePitches: pitches.size };
}

export async function render(intake, _ctx) {
  let midi;
  try { midi = parseMidi(intake); } catch (err) { return { bodyHtml: '<p class="midi-doc">Preview failed: ' + esc(err.message) + '</p>', hadUnsafe: false }; }
  const rows = midi.tracks.map((t, i) => {
    const instrument = t.program != null ? GM[t.program] || ('Program ' + t.program) : t.instrumentName || '—';
    return `<tr><td data-label="#">${i + 1}</td><td data-label="Name">${esc(t.name || 'Track ' + (i + 1))}</td>`
      + `<td data-label="Channel">${esc(t.channel || '—')}</td><td data-label="Instrument">${esc(instrument)}</td>`
      + `<td data-label="Notes">${t.notes}</td></tr>`;
  }).join('');
  const styles = `<style>
    .midi-doc{max-width:920px;margin:0 auto;padding:18px;color:#172033;font-family:system-ui,sans-serif}
    .midi-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}
    .midi-card{border:1px solid #d9e1ec;border-radius:8px;background:#f8fafc;padding:10px 12px;min-width:120px}
    .midi-card strong{display:block;font-size:1.2rem}.midi-card span{font-size:.82rem;color:#5a6678}
    .midi-table{width:100%;border-collapse:collapse;font-size:.9rem}
    .midi-table th,.midi-table td{border-bottom:1px solid #e2e8f0;padding:8px;text-align:left}
    .fv-dark .midi-doc{color:#e8edf7}.fv-dark .midi-card{background:#111827;border-color:#304052}
    .fv-dark .midi-card span{color:#aab5c6}.fv-dark .midi-table th,.fv-dark .midi-table td{border-color:#304052}
    @media(max-width:520px){
      .midi-doc{padding:12px}.midi-card{flex:1 1 105px;min-width:0}
      .midi-table,.midi-table tbody,.midi-table tr,.midi-table td{display:block;width:100%}.midi-table thead{display:none}
      .midi-table tr{border:1px solid #d9e1ec;border-radius:8px;margin:0 0 10px;overflow:hidden}
      .midi-table td{display:grid;grid-template-columns:96px minmax(0,1fr);gap:8px;border-bottom:1px solid #e2e8f0;overflow-wrap:anywhere;white-space:normal}
      .midi-table td:last-child{border-bottom:0}.midi-table td::before{content:attr(data-label);font-weight:600;color:#5a6678;white-space:nowrap}
      .fv-dark .midi-table tr{border-color:#304052}.fv-dark .midi-table td::before{color:#aab5c6}
    }
  </style>`;
  const summary = `<div class="midi-summary"><div class="midi-card"><strong>Type ${midi.format}</strong><span>Format</span></div>`
    + `<div class="midi-card"><strong>${midi.declaredTracks}</strong><span>Tracks</span></div>`
    + `<div class="midi-card"><strong>${midi.ppqn}</strong><span>PPQN</span></div>`
    + `<div class="midi-card"><strong>${esc(midi.bpmText)}</strong><span>BPM</span></div>`
    + `<div class="midi-card"><strong>${esc(midi.timeSignature)}</strong><span>Time signature</span></div>`
    + `<div class="midi-card"><strong>${midi.durationSeconds.toFixed(2)}s</strong><span>Duration</span></div>`
    + `<div class="midi-card"><strong>${midi.totalNotes}</strong><span>Notes</span></div>`
    + `<div class="midi-card"><strong>${midi.uniquePitches}</strong><span>Unique pitches</span></div></div>`;
  const table = `<table class="midi-table"><thead><tr><th>#</th><th>Name</th><th>Channel</th><th>Instrument</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table>`;
  return { hadUnsafe: false, bodyHtml: `<section class="midi-doc">${styles}${summary}${table}</section>` };
}
