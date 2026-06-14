import { hasExtension } from '../../../core/detect.js';

// FictionBook 2 (.fb2) — a plain-XML ebook. Claim the extension strongly, and the <FictionBook>
// root element as a content signal so a mis-named .xml still routes here (above the generic XML
// type). Zipped .fb2.zip is not handled here (open it as an archive).
export function detect(intake) {
  if (hasExtension(intake, 'fb2')) return 0.96;
  const s = intake.textSample || '';
  if (/<FictionBook[\s>]/.test(s)) return 0.9;
  return 0;
}
