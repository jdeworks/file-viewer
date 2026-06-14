// Word (.docx) preview: mammoth converts to clean semantic HTML, which we sanitize and put
// in the sandboxed iframe — same trust path as markdown. mammoth runs in the parent and
// only parses the document; nothing from the file executes.
import { loadGlobal, vendor } from '../../../core/script-loader.js';

async function libs() {
  const [mammoth, DOMPurify] = await Promise.all([
    loadGlobal(vendor('mammoth/mammoth.browser.min.js'), 'mammoth'),
    loadGlobal(vendor('dompurify/purify.min.js'), 'DOMPurify'),
  ]);
  return { mammoth, DOMPurify };
}

export async function convert(intake) {
  const { mammoth } = await libs();
  return mammoth.convertToHtml({ arrayBuffer: intake.bytes.slice().buffer });
}

export async function render(intake, _ctx) {
  const { mammoth, DOMPurify } = await libs();
  const result = await mammoth.convertToHtml({ arrayBuffer: intake.bytes.slice().buffer });
  DOMPurify.removed = [];
  const clean = DOMPurify.sanitize(result.value, { FORBID_TAGS: ['script', 'style'], FORBID_ATTR: ['onerror', 'onload', 'onclick'] });
  return {
    bodyHtml: '<article class="docx-body">' + clean + '</article>',
    hadUnsafe: DOMPurify.removed.length > 0,
  };
}
