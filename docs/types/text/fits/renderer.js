// Parse the ASCII header of a FITS (Flexible Image Transport System) file.
// FITS header: fixed-width 80-char records in 2880-byte blocks.
// Each record: 8-char keyword, optional "= value / comment"
// Records end with "END" keyword.

function parseCard(rec) {
  const kw = rec.slice(0, 8).trim();
  if (!kw || kw === 'END') return kw === 'END' ? null : undefined;
  const valueComment = rec.slice(10).trimEnd();
  let value = valueComment;
  let comment = '';
  const slashIdx = valueComment.search(/(?<!')\s*\/\s*/);
  if (slashIdx >= 0) {
    value = valueComment.slice(0, slashIdx).trim();
    comment = valueComment.slice(slashIdx).replace(/^\s*\/\s*/, '').trim();
  }
  if (value.startsWith('=')) value = value.slice(1).trim();
  value = value.replace(/^'(.*?)'$/, (_, s) => s.trim());
  return { kw, value, comment };
}

function parseFitsHeader(intake) {
  const cards = [];

  if (intake.isBinary && intake.bytes) {
    // Binary FITS: fixed 80-char records in 2880-byte blocks
    const text = String.fromCharCode(...intake.bytes.slice(0, 46080));
    for (let i = 0; i < text.length; i += 80) {
      const result = parseCard(text.slice(i, i + 80).padEnd(80, ' '));
      if (result === null) break;  // END
      if (result) cards.push(result);
    }
  } else {
    // Text FITS: newline-delimited records (our sample and many distributed headers)
    const lines = (intake.text || '').split('\n').slice(0, 600);
    for (const line of lines) {
      // Pad to 80 chars for consistent slicing
      const result = parseCard(line.padEnd(80, ' '));
      if (result === null) break;  // END
      if (result) cards.push(result);
    }
  }
  return cards;
}

function val(cards, kw) {
  return cards.find((c) => c.kw === kw)?.value || null;
}

const INTERESTING = ['SIMPLE', 'BITPIX', 'NAXIS', 'NAXIS1', 'NAXIS2', 'NAXIS3',
  'OBJECT', 'TELESCOP', 'INSTRUME', 'OBSERVER', 'DATE-OBS', 'DATE', 'EXPTIME',
  'BSCALE', 'BZERO', 'BUNIT', 'ORIGIN', 'EXTEND', 'EQUINOX', 'RADESYS'];

const BITPIX_DESC = {
  8: '8-bit unsigned int', 16: '16-bit int', 32: '32-bit int',
  64: '64-bit int', '-32': '32-bit float', '-64': '64-bit float',
};

function row(label, value, comment) {
  if (!value && value !== '0') return '';
  const note = comment ? `<span class="fits-comment"> / ${comment}</span>` : '';
  return `<tr><td class="fits-key">${label}</td><td>${value}${note}</td></tr>`;
}

export function render(intake) {
  const cards = parseFitsHeader(intake);

  if (!cards.length) {
    return { bodyHtml: '<div class="fits-preview"><p class="fits-note">No FITS header found.</p></div>' };
  }

  const naxis = val(cards, 'NAXIS') || '0';
  const naxis1 = val(cards, 'NAXIS1');
  const naxis2 = val(cards, 'NAXIS2');
  const naxis3 = val(cards, 'NAXIS3');
  const bitpix = val(cards, 'BITPIX');
  const dims = [naxis1, naxis2, naxis3].filter(Boolean).join(' × ');
  const bpDesc = bitpix ? (BITPIX_DESC[bitpix] || `${bitpix}-bit`) : null;

  const statsHtml = `<div class="fits-stats">
    ${dims ? `<div class="fits-stat"><div class="fits-stat-value">${dims}</div><div class="fits-stat-label">Dimensions</div></div>` : ''}
    ${naxis ? `<div class="fits-stat"><div class="fits-stat-value">${naxis}</div><div class="fits-stat-label">NAXIS</div></div>` : ''}
    ${bpDesc ? `<div class="fits-stat"><div class="fits-stat-value">${bpDesc}</div><div class="fits-stat-label">Data Type</div></div>` : ''}
    ${cards.length ? `<div class="fits-stat"><div class="fits-stat-value">${cards.length}</div><div class="fits-stat-label">Header Cards</div></div>` : ''}
  </div>`;

  // Table of interesting keyword=value pairs
  const seen = new Set(INTERESTING);
  const keyRows = cards
    .filter((c) => seen.has(c.kw) || c.kw.startsWith('COMMENT') || c.kw.startsWith('HISTORY'))
    .map((c) => {
      let v = c.value;
      if (c.kw === 'BITPIX' && BITPIX_DESC[v]) v = `${v} (${BITPIX_DESC[v]})`;
      return row(c.kw, v, c.comment);
    }).join('');

  // Full card dump (collapsed)
  const allRows = cards.map((c) => `<tr><td class="fits-key">${c.kw}</td><td><code>${c.value}</code>${c.comment ? `<span class="fits-comment"> / ${c.comment}</span>` : ''}</td></tr>`).join('');

  const bodyHtml = `<div class="fits-preview">
  <div class="fits-header"><span class="fits-badge">FITS</span><span class="fits-subhead">${val(cards, 'OBJECT') || 'Flexible Image Transport System'}</span></div>
  ${statsHtml}
  ${keyRows ? `<table class="fits-table">${keyRows}</table>` : ''}
  <details class="fits-all"><summary>${cards.length} header cards</summary><table class="fits-table">${allRows}</table></details>
</div>`;

  return { bodyHtml };
}
