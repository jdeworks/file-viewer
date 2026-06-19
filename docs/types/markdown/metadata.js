// Markdown-specific metadata, on top of the generic name/size/lastModified the shell shows.
import { META_KEYS, textFact, typeFact } from '../../core/metadata-helpers.js';

export function extract(intake) {
  const text = intake.text || '';
  const lines = text.split('\n');
  const words = (text.match(/\S+/g) || []).length;
  const headings = (text.match(/^#{1,6}\s+\S/gm) || []).length;
  const links = (text.match(/\[[^\]]+\]\([^)]+\)/g) || []).length;
  const codeBlocks = (text.match(/^```/gm) || []).length >> 1;
  const images = (text.match(/!\[[^\]]*\]\([^)]+\)/g) || []).length;
  const tables = (text.match(/^\s*\|.+\|\s*$/gm) || []).length;
  const htmlBlocks = (text.match(/^\s*<\/?[a-z][\w-]*(?:\s|>|$)/gim) || []).length;
  // First H1 as a title, if present.
  const h1 = (text.match(/^#\s+(.+)$/m) || [])[1] || null;
  return [
    h1 ? typeFact('Title', h1) : null,
    textFact('Lines', String(lines.length), META_KEYS.logicalLines, 0),
    typeFact('Words', String(words)),
    typeFact('Headings', String(headings)),
    typeFact('Links', String(links)),
    typeFact('Images', String(images)),
    typeFact('Code blocks', String(codeBlocks)),
    typeFact('Table rows', String(tables)),
    typeFact('HTML blocks', String(htmlBlocks)),
    typeFact('Read time', Math.max(1, Math.round(words / 200)) + ' min'),
  ].filter(Boolean);
}
