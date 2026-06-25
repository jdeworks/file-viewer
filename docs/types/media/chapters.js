function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function cleanTitle(title, fallback) {
  const text = String(title || '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

export function normalizeChapters(chapters, duration) {
  if (!Array.isArray(chapters) || !chapters.length) return [];
  const dur = finiteNumber(duration);
  const max = dur !== null && dur >= 0 ? dur : null;
  const sorted = chapters
    .map((chapter, originalIndex) => {
      const start = finiteNumber(chapter?.start);
      if (start === null) return null;
      const clamped = Math.max(0, max === null ? start : Math.min(start, max));
      return {
        ...chapter,
        start: clamped,
        originalIndex,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start || a.originalIndex - b.originalIndex);

  const out = [];
  for (const chapter of sorted) {
    const prev = out[out.length - 1];
    if (prev && Math.abs(prev.start - chapter.start) < 0.001) continue;
    out.push({
      ...chapter,
      title: cleanTitle(chapter.title, `Chapter ${out.length + 1}`),
    });
  }

  for (let i = 0; i < out.length; i += 1) {
    const next = out[i + 1];
    const ownEnd = finiteNumber(out[i].end);
    const clampedOwnEnd = ownEnd === null ? null : Math.max(out[i].start, max === null ? ownEnd : Math.min(ownEnd, max));
    const end = next ? next.start : (max ?? clampedOwnEnd);
    out[i].end = end !== null && end >= out[i].start ? end : null;
    delete out[i].originalIndex;
  }
  return out;
}

function safeNamePart(value, fallback) {
  const text = String(value || '').replace(/\.[^.]+$/, '').trim() || fallback;
  const ascii = text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const safe = ascii
    .replace(/['"`]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
  return safe || fallback;
}

export function chapterFilename(base, chapter, index) {
  const book = safeNamePart(base, 'Audio');
  const title = safeNamePart(chapter?.title, `Chapter_${index + 1}`);
  const n = String(index + 1).padStart(2, '0');
  return `${book}_${n}_${title}.mp3`;
}
