import { parseVCards } from './vcardlib.js';

export function extract(intake) {
  const cards = parseVCards(intake.text || '');
  const emails = cards.reduce((n, c) => n + c.emails.length, 0);
  const tels = cards.reduce((n, c) => n + c.tels.length, 0);
  const urls = cards.reduce((n, c) => n + c.urls.length, 0);
  const addresses = cards.reduce((n, c) => n + c.adrs.length, 0);
  const orgs = cards.filter((c) => c.org).length;
  const photos = cards.filter((c) => c.hasPhoto).length;
  return [
    { label: 'Contacts', value: String(cards.length) },
    { label: 'Emails', value: String(emails) },
    { label: 'Phones', value: String(tels) },
    { label: 'Addresses', value: String(addresses) },
    { label: 'URLs', value: String(urls) },
    { label: 'Organizations', value: String(orgs) },
    { label: 'Photos', value: String(photos) },
  ];
}
