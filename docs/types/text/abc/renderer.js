// ABC notation viewer — parses tune headers and shows a structured list.
// ABC spec: https://abcnotation.com/wiki/abc:standard:v2.1

const FIELD_LABELS = {
  X: 'Index', T: 'Title', C: 'Composer', Z: 'Transcriber', O: 'Origin',
  A: 'Area', S: 'Source', N: 'Notes', G: 'Group', H: 'History',
  R: 'Rhythm', M: 'Meter', L: 'Default Note Length', Q: 'Tempo', K: 'Key',
  V: 'Voice', F: 'File URL', W: 'Words (inline)', B: 'Book',
};

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function parseTunes(text) {
  const tunes = [];
  let current = null;

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('%')) continue;

    const m = line.match(/^([A-Za-z+]):\s*(.*)/);
    if (m) {
      const [, key, value] = m;
      if (key === 'X') {
        current = { index: value.trim(), fields: [] };
        tunes.push(current);
      } else if (current) {
        current.fields.push({ key, value: value.trim() });
      }
    }
  }
  return tunes;
}

function tuneCard(tune) {
  const title = tune.fields.find((f) => f.key === 'T')?.value || '(untitled)';
  const composer = tune.fields.find((f) => f.key === 'C')?.value || null;
  const key = tune.fields.find((f) => f.key === 'K')?.value || null;
  const meter = tune.fields.find((f) => f.key === 'M')?.value || null;
  const rhythm = tune.fields.find((f) => f.key === 'R')?.value || null;
  const tempo = tune.fields.find((f) => f.key === 'Q')?.value || null;

  const pills = [key && `Key: ${key}`, meter && `Meter: ${meter}`, rhythm, tempo && `Tempo: ${tempo}`]
    .filter(Boolean)
    .map((p) => `<span class="abc-pill">${esc(p)}</span>`)
    .join('');

  return `<div class="abc-tune">
  <div class="abc-tune-header">
    <span class="abc-index">X:${esc(tune.index)}</span>
    <span class="abc-tune-title">${esc(title)}</span>
  </div>
  ${composer ? `<div class="abc-composer">${esc(composer)}</div>` : ''}
  ${pills ? `<div class="abc-pills">${pills}</div>` : ''}
</div>`;
}

export function render(intake) {
  const text = intake.text || '';
  const tunes = parseTunes(text);

  if (!tunes.length) {
    return { bodyHtml: '<div class="abc-preview"><p class="abc-note">No ABC tune headers found.</p></div>' };
  }

  const badge = `<span class="abc-badge">ABC</span>`;
  const subtitle = `<span class="abc-subtitle">${tunes.length} tune${tunes.length !== 1 ? 's' : ''}</span>`;

  const cards = tunes.slice(0, 30).map(tuneCard).join('');
  const more = tunes.length > 30 ? `<p class="abc-note">Showing first 30 of ${tunes.length} tunes.</p>` : '';

  const bodyHtml = `<div class="abc-preview">
  <div class="abc-header">${badge}${subtitle}</div>
  <div class="abc-tunes">${cards}</div>
  ${more}
</div>`;

  return { bodyHtml };
}
