const DSC = [
  ['Title',         /^%%Title:\s*(.+)/],
  ['Creator',       /^%%Creator:\s*(.+)/],
  ['CreationDate',  /^%%CreationDate:\s*(.+)/],
  ['For',           /^%%For:\s*(.+)/],
  ['LanguageLevel', /^%%LanguageLevel:\s*(.+)/],
  ['Pages',         /^%%Pages:\s*(.+)/],
  ['Orientation',   /^%%Orientation:\s*(.+)/],
  ['BoundingBox',   /^%%BoundingBox:\s*(.+)/],
  ['HiResBoundingBox', /^%%HiResBoundingBox:\s*(.+)/],
  ['DocumentFonts', /^%%DocumentFonts:\s*(.+)/],
  ['DocumentData',  /^%%DocumentData:\s*(.+)/],
];

function strip(v) {
  return v.replace(/^\(|\)$/g, '').trim();
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function parseDsc(text) {
  const lines = text.slice(0, 8000).split('\n');
  const fields = {};
  let kind = 'PostScript';
  const firstLine = lines[0] || '';
  if (/EPSF/i.test(firstLine)) kind = 'EPS (Encapsulated PostScript)';
  else if (/^%!PS-Adobe/.test(firstLine)) kind = 'PostScript (DSC)';
  else if (/^%!PS/.test(firstLine)) kind = 'PostScript';
  const version = firstLine.match(/PS-Adobe-([\d.]+)/)?.[1] || null;

  for (const line of lines) {
    if (!line.startsWith('%')) break; // DSC ends when code starts
    for (const [key, rx] of DSC) {
      if (key in fields) continue;
      const m = line.match(rx);
      if (m) fields[key] = strip(m[1]);
    }
  }
  const codeLines = lines.filter((l) => !l.startsWith('%') && l.trim()).length;
  return { kind, version, fields, codeLines };
}

function bbox(v) {
  if (!v) return null;
  const [llx, lly, urx, ury] = v.split(/\s+/).map(Number);
  if ([llx, lly, urx, ury].some(isNaN)) return v;
  const w = Math.round(((urx - llx) / 72) * 25.4);
  const h = Math.round(((ury - lly) / 72) * 25.4);
  return `${urx - llx} × ${ury - lly} pt (≈${w}×${h} mm)`;
}

function row(label, value) {
  if (!value) return '';
  return `<tr><td class="ps-key">${esc(label)}</td><td>${esc(value)}</td></tr>`;
}

export function render(intake) {
  const text = intake.text || '';
  const { kind, version, fields, codeLines } = parseDsc(text);

  const versionBadge = version ? `<span class="ps-badge">PS ${version}</span>` : '';
  const kindLabel = `<span class="ps-kind">${kind}</span>`;

  const rows = [
    row('Title', fields.Title),
    row('Creator', fields.Creator),
    row('Date', fields.CreationDate),
    row('For', fields.For),
    row('Pages', fields.Pages),
    row('Orientation', fields.Orientation),
    row('Language Level', fields.LanguageLevel),
    row('Bounding Box', bbox(fields.BoundingBox || fields.HiResBoundingBox)),
    row('Fonts', fields.DocumentFonts),
    row('Data', fields.DocumentData),
    row('Code lines', codeLines > 0 ? String(codeLines) : null),
  ].filter(Boolean).join('');

  const note = `<p class="ps-note">PostScript is a Turing-complete programming language — file execution is not supported. Showing DSC metadata only.</p>`;

  const bodyHtml = `<div class="ps-preview">
  <div class="ps-header">${versionBadge}${kindLabel}</div>
  ${rows ? `<table class="ps-table">${rows}</table>` : '<p class="ps-note">No DSC comments found.</p>'}
  ${note}
</div>`;

  return { bodyHtml };
}
