// vCard (.vcf) preview: parse contacts and render them as cards (name, org/title, emails, phones,
// addresses, links, note). Rendered in parentNode mode so we can add interactive features
// (QR codes) without the iframe/postMessage round-trip. All contact values are HTML-escaped
// before insertion — the host element uses innerHTML of trusted, pre-escaped markup only.
import { parseVCards } from './vcardlib.js';
import { loadGlobal, vendor } from '../../core/script-loader.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function minimalVcard(c) {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  if (c.fn) lines.push('FN:' + c.fn);
  if (c.org) lines.push('ORG:' + c.org);
  if (c.title) lines.push('TITLE:' + c.title);
  for (const t of c.tels) lines.push('TEL;TYPE=' + (t.type || 'VOICE') + ':' + t.value);
  for (const e of c.emails) lines.push('EMAIL;TYPE=' + (e.type || 'INTERNET') + ':' + e.value);
  for (const a of c.adrs) lines.push('ADR:;;;' + a.value.replace(/\n/g, ';') + ';;;');
  for (const u of c.urls) lines.push('URL:' + u);
  if (c.bday) lines.push('BDAY:' + c.bday);
  if (c.note) lines.push('NOTE:' + c.note);
  lines.push('END:VCARD');
  return lines.join('\r\n');
}

function rowHtml(icon, label, inner) {
  return '<div class="vcf-row">'
    + '<span class="vcf-row-icon">' + icon + '</span>'
    + '<span class="vcf-row-body">' + inner + (label ? ' <span class="vcf-type">' + esc(label) + '</span>' : '') + '</span>'
    + '</div>';
}

export async function render(intake, _ctx) {
  const cards = parseVCards(intake.text || '');
  const label = 'contact' + (cards.length === 1 ? '' : 's');
  const host = document.createElement('div');
  host.className = 'vcf-doc';

  if (!cards.length) {
    host.innerHTML = '<div class="vcf-head">👤 0 contacts</div><p class="vcf-empty">No contacts found.</p>';
    return { parentNode: host };
  }

  const cardsHtml = cards.map((c, idx) => {
    let rows = '';
    for (const e of c.emails) rows += rowHtml('✉', e.type, '<a href="mailto:' + esc(e.value) + '">' + esc(e.value) + '</a>');
    for (const t of c.tels) rows += rowHtml('📞', t.type, '<a href="tel:' + esc(t.value.replace(/[^+\d]/g, '')) + '">' + esc(t.value) + '</a>');
    for (const a of c.adrs) rows += rowHtml('📍', a.type, esc(a.value));
    for (const u of c.urls) {
      const href = /^https?:\/\//i.test(u) ? esc(u) : null;
      rows += rowHtml('🔗', '', href ? '<a href="' + href + '" rel="noopener noreferrer">' + esc(u) + '</a>' : esc(u));
    }
    if (c.bday) rows += rowHtml('🎂', '', esc(c.bday));
    const org = (c.title || c.org) ? '<div class="vcf-org">' + esc([c.title, c.org].filter(Boolean).join(' · ')) + '</div>' : '';
    const note = c.note ? '<div class="vcf-note">' + esc(c.note) + '</div>' : '';
    return '<div class="vcf-card">'
      + '<div class="vcf-card-head">'
      +   '<div class="vcf-name">' + esc(c.fn || '(no name)') + '</div>'
      +   '<button class="vcf-qr-btn" data-idx="' + idx + '" title="Show QR code for this contact">QR</button>'
      + '</div>'
      + org + rows + note
      + '<div class="vcf-qr-wrap" data-qr-idx="' + idx + '" hidden></div>'
      + '</div>';
  }).join('');

  host.innerHTML = '<div class="vcf-head">👤 ' + cards.length + ' ' + esc(label) + '</div>' + cardsHtml;

  // Wire QR code buttons — load qrcodejs lazily on first click
  let QRCode = null;
  for (const btn of host.querySelectorAll('.vcf-qr-btn')) {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const wrap = host.querySelector('[data-qr-idx="' + idx + '"]');
      if (!wrap) return;
      // Toggle: hide if already showing
      if (!wrap.hidden) { wrap.hidden = true; btn.classList.remove('active'); return; }
      if (!QRCode) {
        try { QRCode = await loadGlobal(vendor('qrcodejs/qrcode.js'), 'QRCode'); }
        catch { btn.title = 'QR code unavailable'; return; }
      }
      wrap.innerHTML = '';
      wrap.hidden = false;
      btn.classList.add('active');
      new QRCode(wrap, { text: minimalVcard(cards[idx]), width: 160, height: 160, correctLevel: QRCode.CorrectLevel?.M });
    });
  }

  return { parentNode: host };
}
