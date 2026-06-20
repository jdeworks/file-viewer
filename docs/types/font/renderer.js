// Font preview (.ttf/.otf/.woff/.woff2). Loads the font bytes via the FontFace API and renders
// a Google Fonts-style interactive specimen: custom text input, size/color/bg controls, alphabet
// and size-ramp specimens, and a structured info card from the parsed name table.
// Rendered in the parent pane (FontFace registers on this document; the sandboxed iframe can't
// see it). The bytes are font data, not script — safe to load here.
import { extract } from './metadata.js';

let SEQ = 0;

const PANGRAM = 'The quick brown fox jumps over the lazy dog.';
const ALPHABET_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ALPHABET_LOWER = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS_PUNCT = '0123456789  !@#$%^&*()  {}[]<>';
const SIZE_RAMP = [12, 16, 20, 28, 36, 48, 64, 80];
const WEIGHT_MAP = {
  100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular',
  500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black',
};
const BG_CYCLE = ['#ffffff', '#111111', 'transparent'];

export async function render(intake, _ctx) {
  const host = document.createElement('div');
  host.className = 'font-doc';
  const family = 'fvfont-' + (++SEQ);

  let face;
  try {
    face = new FontFace(family, intake.bytes.buffer.slice(
      intake.bytes.byteOffset,
      intake.bytes.byteOffset + intake.bytes.byteLength,
    ));
    await face.load();
    document.fonts.add(face);
  } catch (e) {
    host.innerHTML = '<p class="media-note">Could not load font: ' + (e.message || e) + '</p>';
    return { parentNode: host };
  }

  const fontStyle = '"' + family + '", system-ui, sans-serif';

  // ── Interactive section ──────────────────────────────────────────────────
  const interactive = document.createElement('div');
  interactive.className = 'font-interactive';

  // Sentence input
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'font-sentence-input';
  input.value = PANGRAM;
  input.placeholder = 'Type something…';
  interactive.appendChild(input);

  // Controls bar
  const controls = document.createElement('div');
  controls.className = 'font-controls';

  // Size slider + readout
  const sizeLabel = document.createElement('label');
  sizeLabel.className = 'font-control-label';

  const sizeSlider = document.createElement('input');
  sizeSlider.type = 'range';
  sizeSlider.min = '12';
  sizeSlider.max = '200';
  sizeSlider.value = '48';
  sizeSlider.className = 'font-size-slider';

  const sizeReadout = document.createElement('span');
  sizeReadout.className = 'font-size-readout';
  sizeReadout.textContent = '48px';

  sizeLabel.appendChild(sizeSlider);
  sizeLabel.appendChild(sizeReadout);
  controls.appendChild(sizeLabel);

  // Color picker
  const colorPicker = document.createElement('input');
  colorPicker.type = 'color';
  colorPicker.value = '#111111';
  colorPicker.className = 'font-color-picker';
  colorPicker.title = 'Text color';
  controls.appendChild(colorPicker);

  // Background toggle button
  let bgIndex = 0;
  const bgBtn = document.createElement('button');
  bgBtn.className = 'font-bg-btn';
  bgBtn.textContent = 'BG: White';
  bgBtn.type = 'button';
  controls.appendChild(bgBtn);

  interactive.appendChild(controls);

  // Large preview div
  const preview = document.createElement('div');
  preview.className = 'font-preview-text';
  preview.style.fontFamily = fontStyle;
  preview.style.fontSize = '48px';
  preview.style.color = '#111111';
  preview.textContent = PANGRAM;
  interactive.appendChild(preview);

  // Wire up live updates
  const updatePreview = () => {
    preview.textContent = input.value || PANGRAM;
  };
  input.addEventListener('input', updatePreview);

  sizeSlider.addEventListener('input', () => {
    const px = sizeSlider.value + 'px';
    preview.style.fontSize = px;
    sizeReadout.textContent = px;
  });

  colorPicker.addEventListener('input', () => {
    preview.style.color = colorPicker.value;
  });

  bgBtn.addEventListener('click', () => {
    bgIndex = (bgIndex + 1) % BG_CYCLE.length;
    const bg = BG_CYCLE[bgIndex];
    preview.style.background = bg === 'transparent' ? '' : bg;
    if (bg === 'transparent') preview.style.removeProperty('background');
    bgBtn.textContent = bg === '#ffffff' ? 'BG: White' : bg === '#111111' ? 'BG: Black' : 'BG: Trans.';
  });

  host.appendChild(interactive);

  // ── Specimen sections ────────────────────────────────────────────────────
  const specimens = document.createElement('div');
  specimens.className = 'font-specimens';

  // Alphabet block
  const alphabetBlock = makeSpecimenBlock('Alphabet');
  addSpecimenRow(alphabetBlock, ALPHABET_UPPER, 24, fontStyle);
  addSpecimenRow(alphabetBlock, ALPHABET_LOWER, 24, fontStyle);
  specimens.appendChild(alphabetBlock);

  // Digits + punctuation block
  const digitBlock = makeSpecimenBlock('Digits & Symbols');
  addSpecimenRow(digitBlock, DIGITS_PUNCT, 24, fontStyle);
  specimens.appendChild(digitBlock);

  // Size ramp block
  const rampBlock = makeSpecimenBlock('Size Ramp');
  for (const sz of SIZE_RAMP) {
    addSpecimenRow(rampBlock, PANGRAM, sz, fontStyle, sz + 'px');
  }
  specimens.appendChild(rampBlock);

  // Weight specimen block
  const weightBlock = makeSpecimenBlock('Weights');
  for (const [w, name] of Object.entries(WEIGHT_MAP)) {
    const row = document.createElement('div');
    row.className = 'font-specimen-row';
    const lbl = document.createElement('span');
    lbl.className = 'font-specimen-label';
    lbl.textContent = w + ' ' + name;
    const sample = document.createElement('span');
    sample.className = 'font-sample';
    sample.style.fontFamily = fontStyle;
    sample.style.fontSize = '20px';
    sample.style.fontWeight = w;
    sample.textContent = PANGRAM;
    row.appendChild(lbl);
    row.appendChild(sample);
    weightBlock.appendChild(row);
  }
  specimens.appendChild(weightBlock);

  host.appendChild(specimens);

  // ── Info card ────────────────────────────────────────────────────────────
  const metaRows = extract(intake);
  if (metaRows.length) {
    const card = document.createElement('div');
    card.className = 'font-info-card';

    const cardTitle = document.createElement('div');
    cardTitle.className = 'font-info-title';
    cardTitle.textContent = intake.filename;
    card.appendChild(cardTitle);

    const table = document.createElement('table');
    table.className = 'font-info-table';
    for (const { label, value } of metaRows) {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = label;
      const td = document.createElement('td');
      // Detect URLs in vendor/license URL fields and linkify them
      if (/^https?:\/\//i.test(value)) {
        const a = document.createElement('a');
        a.href = value;
        a.textContent = value;
        a.rel = 'noopener noreferrer';
        a.target = '_blank';
        td.appendChild(a);
      } else {
        td.textContent = value;
      }
      tr.appendChild(th);
      tr.appendChild(td);
      table.appendChild(tr);
    }
    card.appendChild(table);
    host.appendChild(card);
  }

  return {
    parentNode: host,
    revoke: () => { try { document.fonts.delete(face); } catch {} },
  };
}

function makeSpecimenBlock(title) {
  const block = document.createElement('div');
  block.className = 'font-specimen-block';
  const heading = document.createElement('div');
  heading.className = 'font-specimen-heading';
  heading.textContent = title;
  block.appendChild(heading);
  return block;
}

function addSpecimenRow(block, text, size, fontFamily, labelOverride) {
  const row = document.createElement('div');
  row.className = 'font-specimen-row';
  const lbl = document.createElement('span');
  lbl.className = 'font-specimen-label';
  lbl.textContent = labelOverride || (size + 'px');
  const sample = document.createElement('span');
  sample.className = 'font-sample';
  sample.style.fontFamily = fontFamily;
  sample.style.fontSize = size + 'px';
  sample.textContent = text;
  row.appendChild(lbl);
  row.appendChild(sample);
  block.appendChild(row);
}
