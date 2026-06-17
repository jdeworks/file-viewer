import { parseRom } from './headers.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

export async function render(intake, _ctx) {
  const rom = parseRom(intake.bytes);
  if (!rom) return { bodyHtml: '<p class="rom-doc">ROM header not recognized.</p>', hadUnsafe: false };
  const rows = rom.fields.map(([label, value]) => '<tr><th>' + esc(label) + '</th><td>' + esc(value) + '</td></tr>').join('');
  return {
    hadUnsafe: false,
    bodyHtml: `<section class="rom-doc">
  <style>
    .rom-doc{max-width:760px;margin:0 auto;padding:18px;color:#172033;font-family:system-ui,sans-serif}.rom-card{border:1px solid #d9e1ec;border-radius:8px;background:#f8fafc;padding:16px}.rom-head{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:12px}.rom-head h1{font-size:1.35rem;margin:0}.rom-badge{border-radius:999px;background:#172033;color:#fff;padding:3px 9px;font-size:.75rem;text-transform:uppercase}.rom-table{width:100%;border-collapse:collapse}.rom-table th,.rom-table td{border-top:1px solid #e2e8f0;padding:9px 8px;text-align:left}.rom-table th{width:210px;color:#5a6678;font-weight:600}.fv-dark .rom-doc{color:#e8edf7}.fv-dark .rom-card{background:#111827;border-color:#304052}.fv-dark .rom-table th,.fv-dark .rom-table td{border-color:#304052}.fv-dark .rom-table th{color:#aab5c6}.fv-dark .rom-badge{background:#e8edf7;color:#111827}
  </style>
  <div class="rom-card"><div class="rom-head"><h1>${esc(rom.title)}</h1><span class="rom-badge">${esc(rom.format)}</span></div><table class="rom-table"><tbody>${rows}</tbody></table></div>
</section>`,
  };
}
