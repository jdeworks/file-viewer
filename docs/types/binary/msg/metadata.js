// Metadata extractor for .msg Outlook email files

import { loadCFB } from './cfblib.js';

function findProp(cfbLib, cfb, tag) {
  const suffixes = ['001F', '001E', '0102', '0000'];
  for (const suf of suffixes) {
    const entry = cfbLib.find(cfb, `/__substg1.0_${tag}${suf}`);
    if (entry?.content?.length) return { content: entry.content, suffix: suf };
  }
  return null;
}

function bytes(content) {
  if (content instanceof Uint8Array) return content;
  if (content instanceof ArrayBuffer) return new Uint8Array(content);
  return Uint8Array.from(content || []);
}

function decodeString(content, suffix) {
  if (!content?.length) return '';
  const data = bytes(content);
  if (suffix === '001F') {
    return new TextDecoder('utf-16le').decode(data).replace(/\0+$/, '');
  }
  return Array.from(data).map(b => String.fromCharCode(b)).join('').replace(/\0+$/, '');
}

function getProp(cfbLib, cfb, tag) {
  const found = findProp(cfbLib, cfb, tag);
  if (!found) return '';
  return decodeString(found.content, found.suffix);
}

export async function extractMetadata(intake) {
  try {
    const cfbLib = await loadCFB();
    const cfb = cfbLib.read(intake.bytes, { type: 'array' });

    const subject    = getProp(cfbLib, cfb, '0037');
    const senderName = getProp(cfbLib, cfb, '0042');
    const senderMail = getProp(cfbLib, cfb, '0C1F');
    const displayTo  = getProp(cfbLib, cfb, '0E04');
    const displayCc  = getProp(cfbLib, cfb, '0E03');
    const hasHtml    = !!findProp(cfbLib, cfb, '1013');

    // Count attachments
    const seen = new Set();
    for (const path of (cfb.FullPaths || [])) {
      const m = path.match(/\/__attach_#([0-9A-Fa-f]+)\//);
      if (m) seen.add(m[1]);
    }
    const attachmentCount = seen.size;

    return {
      format:          'Outlook Email',
      subject:         subject || null,
      from:            [senderName, senderMail ? `<${senderMail}>` : ''].filter(Boolean).join(' ') || null,
      to:              displayTo || null,
      cc:              displayCc || null,
      hasHtml,
      attachmentCount: attachmentCount > 0 ? attachmentCount : null,
    };
  } catch {
    return { format: 'Outlook Email' };
  }
}
