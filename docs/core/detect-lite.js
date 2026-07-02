let litePromise = null;

function liteData() {
  if (!litePromise) {
    litePromise = fetch('core/detect-lite.generated.json')
      .then((res) => res.ok ? res.json() : { types: [] })
      .catch(() => ({ types: [] }));
  }
  return litePromise;
}

function extensionOf(filename) {
  const base = String(filename || '').toLowerCase().split('/').pop();
  const idx = base.lastIndexOf('.');
  return idx > 0 ? base.slice(idx + 1) : '';
}

export async function rankLiteCandidates(intake, limit = 5) {
  const data = await liteData();
  const ext = extensionOf(intake?.filename);
  const mime = String(intake?.mimeType || '').toLowerCase();
  const rows = [];
  for (const type of data.types || []) {
    let score = 0;
    if (ext && type.extensions?.includes(ext)) score += 2;
    if (mime && type.mimes?.some((needle) => mime.includes(needle))) score += 1;
    if (score > 0) rows.push({ type, score });
  }
  rows.sort((a, b) => b.score - a.score || a.type.label.localeCompare(b.type.label));
  return rows.slice(0, limit);
}
