// vCard (.vcf) preview: parse contacts and render them as cards (name, org/title, emails, phones,
// addresses, links, note). All values escaped — contact text is untrusted. Rendered in the
// sandboxed iframe. Links are href-only (mailto:/tel:/http) so nothing is requested automatically.
import { parseVCards } from './vcardlib.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function line(icon, label, value, href) {
  const inner = href ? '<a href="' + esc(href) + '" rel="noopener noreferrer">' + esc(value) + '</a>' : esc(value);
  return '<div class="vcf-row"><span class="vcf-ic">' + icon + '</span><span class="vcf-val">' + inner
    + (label ? ' <span class="vcf-type">' + esc(label) + '</span>' : '') + '</span></div>';
}

export async function render(intake, _ctx) {
  const cards = parseVCards(intake.text || '');
  const head = '<div class="vcf-head">👤 ' + cards.length + ' contact' + (cards.length === 1 ? '' : 's') + '</div>';
  if (!cards.length) return { bodyHtml: '<div class="vcf-doc">' + head + '<p class="vcf-empty">No contacts found.</p></div>', hadUnsafe: false };

  const html = cards.map((c) => {
    let card = '<div class="vcf-card"><div class="vcf-name">' + esc(c.fn || '(no name)') + '</div>';
    if (c.title || c.org) card += '<div class="vcf-org">' + esc([c.title, c.org].filter(Boolean).join(' · ')) + '</div>';
    for (const e of c.emails) card += line('✉', e.type, e.value, 'mailto:' + e.value);
    for (const t of c.tels) card += line('📞', t.type, t.value, 'tel:' + t.value.replace(/[^+\d]/g, ''));
    for (const a of c.adrs) card += line('📍', a.type, a.value, null);
    for (const u of c.urls) card += line('🔗', '', u, /^https?:\/\//i.test(u) ? u : null);
    if (c.bday) card += line('🎂', '', c.bday, null);
    if (c.note) card += '<div class="vcf-note">' + esc(c.note) + '</div>';
    return card + '</div>';
  }).join('');

  return { bodyHtml: '<div class="vcf-doc">' + head + html + '</div>', hadUnsafe: false };
}
