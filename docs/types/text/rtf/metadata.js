// RTF metadata extractor — reads the {\info ...} group for document properties,
// and provides word/char count estimates from the text content.
import { extractText } from './renderer.js';

/**
 * Extract the content of a named RTF group like {\title ...}.
 * Handles simple single-level text; ignores nested groups.
 */
function extractInfoField(rtf, fieldName) {
  // Find {\fieldName <text>} inside the info group
  const pattern = new RegExp('\\{\\\\' + fieldName + '\\s+', 'i');
  const match = pattern.exec(rtf);
  if (!match) return undefined;

  let i = match.index + match[0].length;
  let depth = 1; // we're inside the opening {
  let text = '';

  while (i < rtf.length && depth > 0) {
    const ch = rtf[i];
    if (ch === '{') { depth++; i++; continue; }
    if (ch === '}') { depth--; if (depth > 0) i++; continue; }
    if (ch === '\\') {
      i++;
      // skip control word
      while (i < rtf.length && /[a-zA-Z]/.test(rtf[i])) i++;
      // skip optional param
      while (i < rtf.length && /[\d-]/.test(rtf[i])) i++;
      // skip trailing space
      if (rtf[i] === ' ') i++;
      continue;
    }
    if (depth === 1) text += ch;
    i++;
  }

  const result = text.trim();
  return result || undefined;
}

/**
 * Find the {\info ...} block and extract document properties from it.
 */
function extractInfoBlock(rtf) {
  const infoMatch = /\{\\info\b/.exec(rtf);
  if (!infoMatch) return {};

  // Grab a generous slice around the info group so we can search within it
  const slice = rtf.slice(infoMatch.index, infoMatch.index + 4096);

  return {
    title:    extractInfoField(slice, 'title'),
    author:   extractInfoField(slice, 'author'),
    subject:  extractInfoField(slice, 'subject'),
    keywords: extractInfoField(slice, 'keywords'),
    comment:  extractInfoField(slice, 'doccomm'),
  };
}

export function extractMetadata(intake) {
  const src = intake.text || '';
  if (!src) return {};

  const info = extractInfoBlock(src);

  // Estimate word/char count from extracted text
  let wordCount;
  let charCount;
  try {
    const text = extractText(src);
    charCount = text.length;
    wordCount = (text.match(/\S+/g) || []).length;
  } catch {
    wordCount = undefined;
    charCount = undefined;
  }

  const result = {};
  if (info.title)    result.title    = info.title;
  if (info.author)   result.author   = info.author;
  if (info.subject)  result.subject  = info.subject;
  if (info.keywords) result.keywords = info.keywords;
  if (info.comment)  result.comment  = info.comment;
  if (wordCount != null) result.wordCount = wordCount;
  if (charCount != null) result.charCount = charCount;

  return result;
}
