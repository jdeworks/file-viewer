function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function getTag(text, tag) { return text.match(new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, 's'))?.[1]?.trim() || null; }
function getAllTags(text, tag) { return [...text.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'g'))].map((m) => m[1]); }
function attr(text, name) { return text.match(new RegExp(`${name}="([^"]*)"`))?.[1] || null; }

function parseHydrogen(text) {
  // Detect type: drumkit or song
  const isDrumkit = /<hydrogen_drumkit>/i.test(text);
  const isSong = /<song\b/i.test(text);

  const name = getTag(text, 'name') || getTag(text, 'info') || '(unnamed)';
  const author = getTag(text, 'author') || null;
  const license = getTag(text, 'license') || null;
  const bpm = getTag(text, 'bpm') || null;
  const version = attr(text, 'version') || null;

  // Drumkit instruments
  const instruments = getAllTags(text, 'instrument').map((ins) => ({
    name: getTag(ins, 'name') || '?',
    id: getTag(ins, 'id') || '',
  }));

  // Song patterns
  const patterns = getAllTags(text, 'pattern').map((p) => ({
    name: getTag(p, 'name') || '?',
    notes: (p.match(/<note>/g) || []).length,
  }));

  return { isDrumkit, isSong, name, author, license, bpm, version, instruments, patterns };
}

function row(label, value) {
  if (!value) return '';
  return `<tr><td class="h2-key">${esc(label)}</td><td>${esc(value)}</td></tr>`;
}

export function render(intake) {
  const text = intake.text || '';
  const { isDrumkit, isSong, name, author, license, bpm, version, instruments, patterns } = parseHydrogen(text);

  const kind = isDrumkit ? 'Drumkit' : isSong ? 'Song' : 'Hydrogen';
  const badge = `<span class="h2-badge">${kind}</span>`;
  const titleEl = `<span class="h2-title">${esc(name)}</span>`;

  const metaRows = [
    row('Name', name),
    row('Author', author),
    row('License', license),
    row('BPM', bpm),
    row('Version', version),
  ].filter(Boolean).join('');

  let instrumentsHtml = '';
  if (instruments.length) {
    const chips = instruments.slice(0, 16).map((i) => `<span class="h2-chip">${esc(i.name)}</span>`).join('');
    const more = instruments.length > 16 ? `<span class="h2-chip-more">+${instruments.length - 16} more</span>` : '';
    instrumentsHtml = `<div class="h2-section"><div class="h2-label">Instruments (${instruments.length})</div><div class="h2-chips">${chips}${more}</div></div>`;
  }

  let patternsHtml = '';
  if (patterns.length) {
    const rows = patterns.slice(0, 10).map((p) =>
      `<tr><td>${esc(p.name)}</td><td>${p.notes} notes</td></tr>`
    ).join('');
    patternsHtml = `<div class="h2-section"><div class="h2-label">Patterns (${patterns.length})</div>
      <table class="h2-table"><tbody>${rows}</tbody></table></div>`;
  }

  const bodyHtml = `<div class="h2-preview">
  <div class="h2-header">${badge}${titleEl}</div>
  ${metaRows ? `<table class="h2-meta">${metaRows}</table>` : ''}
  ${instrumentsHtml}
  ${patternsHtml}
</div>`;

  return { bodyHtml };
}
