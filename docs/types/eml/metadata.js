import { extractMessage } from './mime.js';

export function extract(intake) {
  const m = extractMessage(intake.text || '');
  const rows = [];
  if (m.subject) rows.push({ label: 'Subject', value: m.subject });
  if (m.from) rows.push({ label: 'From', value: m.from });
  if (m.to) rows.push({ label: 'To', value: m.to });
  if (m.cc) rows.push({ label: 'Cc', value: m.cc });
  if (m.date) rows.push({ label: 'Date', value: m.date });
  rows.push({ label: 'Body', value: m.html != null ? 'HTML' : 'plain text' });
  rows.push({ label: 'Attachments', value: String(m.attachments.length) });
  if (m.attachments.length) rows.push({ label: 'Attachment types', value: [...new Set(m.attachments.map((a) => a.type || 'unknown'))].join(', ') });
  return rows;
}
