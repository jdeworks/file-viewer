// vCard (.vcf) preview: parse contacts and render them as cards (name, org/title, emails, phones,
// addresses, links, note). Markup lives in sibling .html templates (doc/card/row) and is filled
// via core/template.js — values go through the {{slot}} interpolator's HTML escaping (contact text
// is untrusted). Rendered in the sandboxed iframe. Links are href-only (mailto:/tel:/http) so
// nothing is requested automatically.
import { parseVCards } from './vcardlib.js';
import { loadTemplate, fill, esc } from '../../core/template.js';

const DOC = new URL('./doc.html', import.meta.url);
const CARD = new URL('./card.html', import.meta.url);
const ROW = new URL('./row.html', import.meta.url);

// One detail row. `inner` is pre-built safe HTML (an escaped value, optionally wrapped in a link).
function rowData(rowTpl, icon, label, value, href) {
  const inner = href ? '<a href="' + esc(href) + '" rel="noopener noreferrer">' + esc(value) + '</a>' : esc(value);
  const type = label ? ' <span class="vcf-type">' + esc(label) + '</span>' : '';
  return fill(rowTpl, { icon, inner, type });
}

export async function render(intake, _ctx) {
  const [docTpl, cardTpl, rowTpl] = await Promise.all([loadTemplate(DOC), loadTemplate(CARD), loadTemplate(ROW)]);
  const cards = parseVCards(intake.text || '');
  const label = 'contact' + (cards.length === 1 ? '' : 's');

  if (!cards.length) {
    return { bodyHtml: fill(docTpl, { count: cards.length, label, body: '<p class="vcf-empty">No contacts found.</p>' }), hadUnsafe: false };
  }

  const body = cards.map((c) => {
    let rows = '';
    for (const e of c.emails) rows += rowData(rowTpl, '✉', e.type, e.value, 'mailto:' + e.value);
    for (const t of c.tels) rows += rowData(rowTpl, '📞', t.type, t.value, 'tel:' + t.value.replace(/[^+\d]/g, ''));
    for (const a of c.adrs) rows += rowData(rowTpl, '📍', a.type, a.value, null);
    for (const u of c.urls) rows += rowData(rowTpl, '🔗', '', u, /^https?:\/\//i.test(u) ? u : null);
    if (c.bday) rows += rowData(rowTpl, '🎂', '', c.bday, null);
    const org = (c.title || c.org) ? '<div class="vcf-org">' + esc([c.title, c.org].filter(Boolean).join(' · ')) + '</div>' : '';
    const note = c.note ? '<div class="vcf-note">' + esc(c.note) + '</div>' : '';
    return fill(cardTpl, { name: c.fn || '(no name)', org, rows, note });
  }).join('');

  return { bodyHtml: fill(docTpl, { count: cards.length, label, body }), hadUnsafe: false };
}
