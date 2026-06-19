import { parseTiffMetadata } from './metadata.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export async function render(intake) {
  const rows = parseTiffMetadata(intake.bytes || new Uint8Array());
  const table = rows.map((r) => `<tr><th>${esc(r.label)}</th><td>${esc(r.value)}</td></tr>`).join('');
  const bodyHtml = `<main class="tiff-doc">
  <section class="tiff-card">
    <h1>TIFF image</h1>
    <p>TIFF was detected and metadata was parsed. Browser-native TIFF image decoding is not reliable, so this preview shows a safe summary instead of raw pixels.</p>
    <table>${table}</table>
  </section>
</main>
<style>
  .tiff-doc{min-height:100%;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--preview-bg,#fff);color:var(--fg,#111);font:14px/1.5 system-ui,sans-serif}
  .tiff-card{width:min(680px,100%);border:1px solid var(--border,#ddd);border-radius:8px;padding:18px 20px;background:var(--bg,#fff)}
  .tiff-card h1{margin:0 0 8px;font-size:20px}
  .tiff-card p{margin:0 0 14px;color:var(--fg-muted,#666)}
  .tiff-card table{width:100%;border-collapse:collapse;font-size:13px}
  .tiff-card th,.tiff-card td{padding:6px 8px;border-top:1px solid var(--border,#e5e5e5);text-align:left;vertical-align:top}
  .tiff-card th{width:42%;color:var(--fg-muted,#666);font-weight:600}
</style>`;
  return { bodyHtml, hadUnsafe: false };
}
