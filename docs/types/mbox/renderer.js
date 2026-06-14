// Mailbox (.mbox) preview: an inbox-style list — one row per message with From / Subject / Date
// and a short text snippet. Each message is parsed with the shared .eml MIME parser; snippets are
// plain text (HTML stripped to text), so everything is escaped and no sanitizer is needed.
// Markup lives in sibling .html templates (doc/msg) filled via core/template.js.
import { splitMbox } from './mboxlib.js';
import { extractMessage } from '../eml/mime.js';
import { loadTemplate, fill, fillEach } from '../../core/template.js';

const DOC = new URL('./doc.html', import.meta.url);
const MSG = new URL('./msg.html', import.meta.url);

const snippet = (msg) => {
  const text = msg.plain || (msg.html ? msg.html.replace(/<[^>]+>/g, ' ') : '');
  const s = text.replace(/\s+/g, ' ').trim();
  return s.length > 280 ? s.slice(0, 280) + '…' : s;
};

export function parsedMessages(text) {
  return splitMbox(text).map((raw) => extractMessage(raw));
}

export async function render(intake, _ctx) {
  const [docTpl, msgTpl] = await Promise.all([loadTemplate(DOC), loadTemplate(MSG)]);
  const msgs = parsedMessages(intake.text || '');
  const head = '<div class="mbox-head">📬 ' + msgs.length + ' message' + (msgs.length === 1 ? '' : 's') + '</div>';
  if (!msgs.length) return { bodyHtml: fill(docTpl, { head, body: '<p class="mbox-empty">No messages found.</p>' }), hadUnsafe: false };

  const rows = fillEach(msgTpl, msgs, (m) => {
    const att = m.attachments && m.attachments.length ? '<span class="mbox-att">📎 ' + m.attachments.length + '</span>' : '';
    return {
      from: m.from || '(unknown sender)',
      date: m.date || '',
      subj: m.subject || '(no subject)',
      att,
      snippet: snippet(m),
    };
  });
  return { bodyHtml: fill(docTpl, { head, body: rows }), hadUnsafe: false };
}
