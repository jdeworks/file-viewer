// Markdown-specific metadata, on top of the generic name/size/lastModified the shell shows.
export function extract(intake) {
  const text = intake.text || '';
  const lines = text.split('\n');
  const words = (text.match(/\S+/g) || []).length;
  const headings = (text.match(/^#{1,6}\s+\S/gm) || []).length;
  const links = (text.match(/\[[^\]]+\]\([^)]+\)/g) || []).length;
  const codeBlocks = (text.match(/^```/gm) || []).length >> 1;
  // First H1 as a title, if present.
  const h1 = (text.match(/^#\s+(.+)$/m) || [])[1] || null;
  return [
    h1 ? { label: 'Title', value: h1 } : null,
    { label: 'Lines', value: String(lines.length) },
    { label: 'Words', value: String(words) },
    { label: 'Headings', value: String(headings) },
    { label: 'Links', value: String(links) },
    { label: 'Code blocks', value: String(codeBlocks) },
    { label: 'Read time', value: Math.max(1, Math.round(words / 200)) + ' min' },
  ].filter(Boolean);
}
