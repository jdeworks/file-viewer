export const PPTX_NOTES_LIMITS = Object.freeze({
  maxSlides: 50,
  maxXmlChars: 1_000_000,
  maxParagraphsPerSlide: 100,
  maxParagraphChars: 2_000,
  maxStoredCharsPerSlide: 20_000,
});

export function formatPptxNotesStatus(result, { error = false } = {}) {
  if (error || !result) return 'Speaker notes could not be extracted';
  const boundedScan = result.scannedSlides < result.totalSlides;
  const scannedSuffix = boundedScan
    ? ' in first ' + result.scannedSlides + ' of ' + result.totalSlides + ' slides'
    : '';
  if (result.slides.length) {
    return result.slides.length + ' slide' + (result.slides.length === 1 ? '' : 's')
      + ' with speaker notes' + scannedSuffix
      + (result.truncated ? ' · bounded preview' : '');
  }
  return 'No speaker notes found' + scannedSuffix
    + (boundedScan ? ' · bounded scan' : '');
}

function decodeXml(value) {
  const codePoint = (raw, radix) => {
    const parsed = Number.parseInt(raw, radix);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 0x10ffff || (parsed >= 0xd800 && parsed <= 0xdfff)) return '\ufffd';
    return String.fromCodePoint(parsed);
  };
  return String(value || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => codePoint(hex, 16))
    .replace(/&#([0-9]+);/g, (_, decimal) => codePoint(decimal, 10))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

function attributes(source) {
  const result = {};
  for (const match of source.matchAll(/([A-Za-z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    result[match[1]] = decodeXml(match[2] ?? match[3] ?? '');
  }
  return result;
}

function relationshipId(attrs) {
  return Object.entries(attrs).find(([name]) => name !== 'id' && name.toLowerCase().endsWith(':id'))?.[1] || '';
}

function parseRelationships(xml) {
  const result = new Map();
  for (const match of String(xml || '').matchAll(/<(?:[\w.-]+:)?Relationship\b([^>]*)\/?\s*>/gi)) {
    const attrs = attributes(match[1]);
    if (attrs.Id) result.set(attrs.Id, attrs);
  }
  return result;
}

function normalizePart(basePart, target) {
  if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) return null;
  const parts = target.startsWith('/') ? [] : basePart.split('/').slice(0, -1);
  for (const segment of target.replace(/^\/+/, '').split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      if (!parts.length) return null;
      parts.pop();
    } else parts.push(segment);
  }
  return parts.join('/');
}

function relationshipsPart(part) {
  const pieces = part.split('/');
  const filename = pieces.pop();
  return [...pieces, '_rels', filename + '.rels'].join('/');
}

function orderedSlideParts(presentationXml, relationshipsXml) {
  const relationships = parseRelationships(relationshipsXml);
  const parts = [];
  for (const match of String(presentationXml || '').matchAll(/<(?:[\w.-]+:)?sldId\b([^>]*)>/gi)) {
    const id = relationshipId(attributes(match[1]));
    const relationship = relationships.get(id);
    if (!relationship || !String(relationship.Type || '').endsWith('/slide')) continue;
    const part = normalizePart('ppt/presentation.xml', relationship.Target);
    if (part) parts.push(part);
  }
  return parts;
}

const OMITTED_PLACEHOLDERS = new Set(['dt', 'ftr', 'hdr', 'sldimg', 'sldnum']);

function noteParagraphs(xml, limits) {
  const boundedXml = String(xml || '').slice(0, limits.maxXmlChars);
  const paragraphs = [];
  let storedChars = 0;
  let truncated = String(xml || '').length > boundedXml.length;
  const shapes = boundedXml.match(/<(?:[\w.-]+:)?sp\b[\s\S]*?<\/(?:[\w.-]+:)?sp>/gi) || [];
  for (const shape of shapes) {
    const placeholder = shape.match(/<(?:[\w.-]+:)?ph\b([^>]*)\/?\s*>/i);
    const placeholderType = placeholder ? String(attributes(placeholder[1]).type || '').toLowerCase() : '';
    if (OMITTED_PLACEHOLDERS.has(placeholderType)) continue;
    for (const paragraph of shape.matchAll(/<(?:[\w.-]+:)?p\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?p>/gi)) {
      const text = [...paragraph[1].matchAll(/<(?:[\w.-]+:)?t\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?t>/gi)]
        .map((match) => decodeXml(match[1].replace(/<[^>]*>/g, ''))).join('').trim();
      if (!text) continue;
      if (paragraphs.length >= limits.maxParagraphsPerSlide || storedChars >= limits.maxStoredCharsPerSlide) {
        truncated = true;
        break;
      }
      const remaining = limits.maxStoredCharsPerSlide - storedChars;
      const characterLimit = Math.min(limits.maxParagraphChars, remaining);
      let bounded = text.slice(0, characterLimit);
      if (bounded.length < text.length) {
        truncated = true;
        bounded = characterLimit > 0
          ? text.slice(0, Math.max(characterLimit - 1, 0)) + '…'
          : '';
      }
      if (!bounded) break;
      paragraphs.push(bounded);
      storedChars += bounded.length;
    }
    if (truncated && (paragraphs.length >= limits.maxParagraphsPerSlide || storedChars >= limits.maxStoredCharsPerSlide)) break;
  }
  return { paragraphs, truncated };
}

export async function extractPptxSpeakerNotes(readPart, options = {}) {
  const limits = { ...PPTX_NOTES_LIMITS, ...options };
  const signal = options.signal;
  const read = async (part) => {
    if (signal?.aborted) throw new DOMException('Preview superseded', 'AbortError');
    return await readPart(part);
  };
  const presentationXml = await read('ppt/presentation.xml');
  const presentationRelationships = await read('ppt/_rels/presentation.xml.rels');
  const orderedSlides = orderedSlideParts(presentationXml, presentationRelationships);
  const scannedSlides = Math.min(orderedSlides.length, limits.maxSlides);
  const slides = [];

  for (let index = 0; index < scannedSlides; index++) {
    const slidePart = orderedSlides[index];
    const slideRelationships = parseRelationships(await read(relationshipsPart(slidePart)) || '');
    const notesRelationship = [...slideRelationships.values()].find((relationship) =>
      String(relationship.Type || '').endsWith('/notesSlide') && relationship.TargetMode !== 'External');
    if (!notesRelationship) continue;
    const notesPart = normalizePart(slidePart, notesRelationship.Target);
    if (!notesPart) continue;
    const notesXml = await read(notesPart);
    if (!notesXml) continue;
    const extracted = noteParagraphs(notesXml, limits);
    if (!extracted.paragraphs.length) continue;
    slides.push({
      slideNumber: index + 1,
      slidePart,
      notesPart,
      headline: extracted.paragraphs[0],
      paragraphCount: extracted.paragraphs.length,
      paragraphs: extracted.paragraphs,
      truncated: extracted.truncated,
    });
  }
  return {
    slides,
    totalSlides: orderedSlides.length,
    scannedSlides,
    truncated: scannedSlides < orderedSlides.length || slides.some((slide) => slide.truncated),
  };
}
