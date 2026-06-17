import { parsedMessages } from './renderer.js';

export function extract(intake) {
  const msgs = parsedMessages(intake.text || '');
  const withAtt = msgs.filter((m) => m.attachments && m.attachments.length).length;
  const html = msgs.filter((m) => m.html != null).length;
  const senders = new Set(msgs.map((m) => m.from).filter(Boolean));
  const attachments = msgs.reduce((n, m) => n + ((m.attachments && m.attachments.length) || 0), 0);
  return [
    { label: 'Messages', value: String(msgs.length) },
    { label: 'Senders', value: String(senders.size) },
    { label: 'With attachments', value: String(withAtt) },
    { label: 'Attachments', value: String(attachments) },
    { label: 'HTML messages', value: String(html) },
  ];
}
