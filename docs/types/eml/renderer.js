// Email preview: a header card (From/To/Subject/Date + attachments) above the message
// body. HTML bodies are DOMPurify-sanitized (mail HTML is untrusted); plain-text bodies
// are escaped. Rendered in the secure sandboxed iframe like the other HTML-ish types.
// Markup lives in sibling .html templates (msg/head-row) and is filled via core/template.js
// — header field values go through {{slot}} escaping (untrusted); the sanitized/escaped
// body is inserted raw via {{&body}} (already safe when it reaches the slot).
import { loadGlobal, vendor } from '../../core/script-loader.js';
import { extractMessage } from './mime.js';
import { loadTemplate, fill, esc } from '../../core/template.js';

const MSG = new URL('./msg.html', import.meta.url);
const HEAD_ROW = new URL('./head-row.html', import.meta.url);

export async function render(intake, _ctx) {
  const [msgTpl, headRowTpl] = await Promise.all([loadTemplate(MSG), loadTemplate(HEAD_ROW)]);
  const msg = extractMessage(intake.text || '');

  const pairs = [['From', msg.from], ['To', msg.to], ['Cc', msg.cc], ['Subject', msg.subject], ['Date', msg.date]];
  const rows = pairs.filter(([, v]) => v).map(([k, v]) => fill(headRowTpl, { label: k, value: v })).join('');
  let header = '<table class="eml-head">' + rows + '</table>';
  if (msg.attachments.length) {
    header += '<div class="eml-att">📎 ' + msg.attachments.length + ' attachment' + (msg.attachments.length > 1 ? 's' : '')
      + ': ' + msg.attachments.map((a) => esc(a.filename)).join(', ') + '</div>';
  }

  let body, hadUnsafe = false;
  if (msg.html != null) {
    const DOMPurify = await loadGlobal(vendor('dompurify/purify.min.js'), 'DOMPurify');
    DOMPurify.removed = [];
    body = '<div class="eml-html">' + DOMPurify.sanitize(msg.html, { FORBID_TAGS: ['script', 'style'], FORBID_ATTR: ['onerror', 'onload', 'onclick'] }) + '</div>';
    hadUnsafe = DOMPurify.removed.length > 0;
  } else {
    body = '<pre class="eml-plain">' + esc(msg.plain || '(no text body)') + '</pre>';
  }
  return { bodyHtml: fill(msgTpl, { header, body }), hadUnsafe };
}
