// Email preview: a header card (From/To/Subject/Date + attachments) above the message
// body. HTML bodies are DOMPurify-sanitized (mail HTML is untrusted); plain-text bodies
// are escaped. Rendered in the secure sandboxed iframe like the other HTML-ish types.
import { loadGlobal, vendor } from '../../core/script-loader.js';
import { extractMessage } from './mime.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function render(intake, _ctx) {
  const msg = extractMessage(intake.text || '');
  const rows = [];
  for (const [k, v] of [['From', msg.from], ['To', msg.to], ['Cc', msg.cc], ['Subject', msg.subject], ['Date', msg.date]]) {
    if (v) rows.push('<tr><th>' + k + '</th><td>' + esc(v) + '</td></tr>');
  }
  let header = '<table class="eml-head">' + rows.join('') + '</table>';
  if (msg.attachments.length) {
    header += '<div class="eml-att">📎 ' + msg.attachments.length + ' attachment' + (msg.attachments.length > 1 ? 's' : '')
      + ': ' + msg.attachments.map((a) => esc(a.filename)).join(', ') + '</div>';
  }

  let content, hadUnsafe = false;
  if (msg.html != null) {
    const DOMPurify = await loadGlobal(vendor('dompurify/purify.min.js'), 'DOMPurify');
    DOMPurify.removed = [];
    content = '<div class="eml-html">' + DOMPurify.sanitize(msg.html, { FORBID_TAGS: ['script', 'style'], FORBID_ATTR: ['onerror', 'onload', 'onclick'] }) + '</div>';
    hadUnsafe = DOMPurify.removed.length > 0;
  } else {
    content = '<pre class="eml-plain">' + esc(msg.plain || '(no text body)') + '</pre>';
  }
  return { bodyHtml: '<div class="eml-msg">' + header + '<hr class="eml-sep">' + content + '</div>', hadUnsafe };
}
