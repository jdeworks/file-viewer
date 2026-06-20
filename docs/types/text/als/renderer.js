function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function valueOf(el) {
  if (!el) return '';
  return el.getAttribute('Value') || el.getAttribute('Name') || el.textContent?.trim() || '';
}

async function readXml(intake) {
  if (intake.truncated) throw new Error('Ableton set is too large to load completely in this browser preview');
  const b = intake.bytes || new Uint8Array();
  if (b.length >= 2 && b[0] === 0x1f && b[1] === 0x8b) {
    const stream = new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new TextDecoder().decode(await new Response(stream).arrayBuffer());
  }
  return intake.text || new TextDecoder().decode(b);
}

export async function parseAls(intake) {
  const xml = await readXml(intake);
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Ableton XML could not be parsed');
  const bpm = valueOf(doc.querySelector('Tempo Manual')) || valueOf(doc.querySelector('Tempo Value')) || '';
  const numerator = valueOf(doc.querySelector('TimeSignature Numerator, CurrentTimeSignature Numerator')) || '4';
  const denominator = valueOf(doc.querySelector('TimeSignature Denominator, CurrentTimeSignature Denominator')) || '4';
  const trackEls = [...doc.querySelectorAll('AudioTrack, MidiTrack, ReturnTrack, MasterTrack')];
  const tracks = trackEls.map((el, i) => {
    const tag = el.tagName;
    const type = tag.replace(/Track$/, '').replace(/^Midi$/, 'MIDI') || 'Track';
    const name = valueOf(el.querySelector('UserName')) || valueOf(el.querySelector('EffectiveName')) || type + ' ' + (i + 1);
    const clips = [...el.querySelectorAll('MidiClip, AudioClip')].map((clip) => valueOf(clip) || valueOf(clip.querySelector('Name'))).filter(Boolean);
    const plugins = [...el.querySelectorAll('PluginDevice')].map((p) => valueOf(p.querySelector('Name EffectiveName')) || valueOf(p.querySelector('Name UserName')) || valueOf(p.querySelector('PluginDesc Name'))).filter(Boolean);
    return { type, name, clips, plugins };
  });
  const plugins = [...new Set(tracks.flatMap((t) => t.plugins))];
  const counts = {
    audio: tracks.filter((t) => t.type === 'Audio').length,
    midi: tracks.filter((t) => t.type === 'MIDI').length,
    return: tracks.filter((t) => t.type === 'Return').length,
    master: tracks.filter((t) => t.type === 'Master').length,
    clips: tracks.reduce((n, t) => n + t.clips.length, 0),
  };
  return { bpm, timeSignature: numerator + '/' + denominator, tracks, plugins, counts };
}

export async function render(intake, _ctx) {
  let data;
  try { data = await parseAls(intake); }
  catch (err) {
    return { bodyHtml: '<div class="als-doc"><p>Preview failed: ' + esc(err.message || err) + '</p></div>', hadUnsafe: false };
  }
  const trackRows = data.tracks.map((t) => `<article class="als-track">
    <div class="als-track-head"><span class="als-badge">${esc(t.type)}</span><strong>${esc(t.name)}</strong><span>${t.clips.length} clip${t.clips.length === 1 ? '' : 's'}</span></div>
    ${t.clips.length ? '<div class="als-clips">' + t.clips.slice(0, 8).map((c) => '<span>' + esc(c) + '</span>').join('') + '</div>' : ''}
    ${t.plugins.length ? '<div class="als-plugins">' + t.plugins.map((p) => '<span>' + esc(p) + '</span>').join('') + '</div>' : ''}
  </article>`).join('');
  const pluginList = data.plugins.length ? data.plugins.map((p) => '<li>' + esc(p) + '</li>').join('') : '<li>None found</li>';
  return {
    hadUnsafe: false,
    bodyHtml: `<section class="als-doc">
  <style>
    .als-doc{max-width:960px;margin:0 auto;padding:18px;color:#172033;font-family:system-ui,sans-serif}
    .als-hero{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:16px}
    .als-metric{border:1px solid #d9e1ec;border-radius:8px;padding:10px 12px;min-width:110px;background:#f8fafc}
    .als-metric strong{display:block;font-size:1.35rem}.als-metric span{font-size:.82rem;color:#5a6678}
    .als-layout{display:grid;grid-template-columns:minmax(0,1fr) 240px;gap:16px}
    .als-track{border:1px solid #d9e1ec;border-radius:8px;padding:12px;margin-bottom:10px;background:#fff}
    .als-track-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.als-track-head span:last-child{margin-left:auto;color:#5a6678;font-size:.86rem}
    .als-badge{font-size:.75rem;text-transform:uppercase;letter-spacing:.04em;border-radius:999px;background:#172033;color:#fff;padding:3px 8px}
    .als-clips,.als-plugins{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.als-clips span,.als-plugins span{font-size:.82rem;border:1px solid #d9e1ec;border-radius:6px;padding:4px 7px;background:#f8fafc}.als-plugins span{background:#eef6ff}
    .als-side{border:1px solid #d9e1ec;border-radius:8px;padding:12px;background:#f8fafc}.als-side h2{font-size:1rem;margin:0 0 8px}.als-side ul{margin:0;padding-left:18px}
    .fv-dark .als-doc{color:#e8edf7}.fv-dark .als-metric,.fv-dark .als-track,.fv-dark .als-side{background:#111827;border-color:#304052}.fv-dark .als-metric span,.fv-dark .als-track-head span:last-child{color:#aab5c6}.fv-dark .als-clips span,.fv-dark .als-plugins span{background:#172033;border-color:#304052}.fv-dark .als-plugins span{background:#133047}
    @media (max-width:760px){.als-doc{padding:12px}.als-layout{grid-template-columns:1fr}.als-track-head span:last-child{margin-left:0}}
  </style>
  <div class="als-hero">
    <div class="als-metric"><strong>${esc(data.bpm || 'n/a')}</strong><span>BPM</span></div>
    <div class="als-metric"><strong>${esc(data.timeSignature)}</strong><span>Time signature</span></div>
    <div class="als-metric"><strong>${data.tracks.length}</strong><span>Tracks</span></div>
    <div class="als-metric"><strong>${data.counts.clips}</strong><span>Clips</span></div>
  </div>
  <div class="als-layout"><div>${trackRows || '<p>No tracks found.</p>'}</div><aside class="als-side"><h2>Plugins</h2><ul>${pluginList}</ul></aside></div>
</section>`,
  };
}
