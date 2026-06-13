import { parseVCards } from './vcardlib.js';

export function extract(intake) {
  const cards = parseVCards(intake.text || '');
  const emails = cards.reduce((n, c) => n + c.emails.length, 0);
  const tels = cards.reduce((n, c) => n + c.tels.length, 0);
  return [
    { label: 'Contacts', value: String(cards.length) },
    { label: 'Emails', value: String(emails) },
    { label: 'Phones', value: String(tels) },
  ];
}
