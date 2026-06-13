// Font preview (.ttf/.otf/.woff/.woff2). Loads the font bytes via the FontFace API and renders
// specimen text — a pangram, the alphabet/digits, and a size ramp — in the actual typeface.
// Rendered in the parent pane (FontFace registers on this document; the sandboxed iframe can't
// see it). The bytes are font data, not script — safe to load here.
let SEQ = 0;

const SAMPLES = [
  { size: 40, text: 'The quick brown fox' },
  { size: 28, text: 'jumps over the lazy dog' },
  { size: 20, text: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
  { size: 20, text: 'abcdefghijklmnopqrstuvwxyz' },
  { size: 20, text: '0123456789  !@#$%^&*()  {}[]<>' },
  { size: 15, text: 'Pack my box with five dozen liquor jugs. 1234567890' },
];

export async function render(intake, _ctx) {
  const host = document.createElement('div');
  host.className = 'font-doc';
  const family = 'fvfont-' + (++SEQ);

  let face;
  try {
    face = new FontFace(family, intake.bytes.buffer.slice(intake.bytes.byteOffset, intake.bytes.byteOffset + intake.bytes.byteLength));
    await face.load();
    document.fonts.add(face);
  } catch (e) {
    host.innerHTML = '<p class="media-note">Could not load font: ' + (e.message || e) + '</p>';
    return { parentNode: host };
  }

  const name = document.createElement('div');
  name.className = 'font-name';
  name.textContent = intake.filename;
  host.appendChild(name);

  for (const s of SAMPLES) {
    const row = document.createElement('div');
    row.className = 'font-sample';
    row.style.fontFamily = '"' + family + '", system-ui, sans-serif';
    row.style.fontSize = s.size + 'px';
    row.textContent = s.text;
    host.appendChild(row);
  }

  return {
    parentNode: host,
    revoke: () => { try { document.fonts.delete(face); } catch {} },
  };
}
