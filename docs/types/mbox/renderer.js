// Mailbox (.mbox) preview: an inbox-style list — one row per message with From / Subject / Date
// and a short text snippet. Each message is parsed with the shared .eml MIME parser; snippets are
// plain text (HTML stripped to text), so everything is escaped and no sanitizer is needed.
import { splitMbox } from './mboxlib.js';
import { extractMessage } from '../eml/mime.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const snippet = (msg) => {
  const text = msg.plain || (msg.html ? msg.html.replace(/<[^>]+>/g, ' ') : '');
  const s = text.replace(/\s+/g, ' ').trim();
  return s.length > 280 ? s.slice(0, 280) + '…' : s;
};

export function parsedMessages(text) {
  return splitMbox(text).map((raw) => extractMessage(raw));
}

export async function render(intake, _ctx) {
  const msgs = parsedMessages(intake.text || '');
  const head = '<div class="mbox-head">📬 ' + msgs.length + ' message' + (msgs.length === 1 ? '' : 's') + '</div>';
  if (!msgs.length) return { bodyHtml: '<div class="mbox-doc">' + head + '<p class="mbox-empty">No messages found.</p></div>', hadUnsafe: false };

  const rows = msgs.map((m) => {
    const att = m.attachments && m.attachments.length ? '<span class="mbox-att">📎 ' + m.attachments.length + '</span>' : '';
    return '<div class="mbox-msg">'
      + '<div class="mbox-row1"><span class="mbox-from">' + esc(m.from || '(unknown sender)') + '</span>'
      + '<span class="mbox-date">' + esc(m.date || '') + '</span></div>'
      + '<div class="mbox-subj">' + esc(m.subject || '(no subject)') + att + '</div>'
      + '<div class="mbox-snippet">' + esc(snippet(m)) + '</div></div>';
  }).join('');
  return { bodyHtml: '<div class="mbox-doc">' + head + rows + '</div>', hadUnsafe: false };
}
