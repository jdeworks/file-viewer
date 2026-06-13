import { parsedMessages } from './renderer.js';

export function extract(intake) {
  const msgs = parsedMessages(intake.text || '');
  const withAtt = msgs.filter((m) => m.attachments && m.attachments.length).length;
  return [
    { label: 'Messages', value: String(msgs.length) },
    { label: 'With attachments', value: String(withAtt) },
  ];
}
