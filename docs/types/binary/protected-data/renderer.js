import { inspectProtectedData } from './parser.js';

function esc(value) {
  return String(value ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

export function render(intake) {
  const info = inspectProtectedData(intake.bytes);
  if (!info) return { bodyHtml: '<p class="viewer-message">This file is not recognized as Windows protected data.</p>', hadUnsafe: false };
  const rows = [
    ['Identification', 'Probable Windows CNG/DPAPI-NG protected secret'],
    ['Protection scope', info.protectionScope],
    ['Key encryption', info.keyEncryption],
    ['Content encryption', info.contentEncryption],
    ['Protected envelope', `${info.envelopeSize.toLocaleString()} bytes`],
    ['Appended encrypted payload', `${info.appendedPayloadSize.toLocaleString()} bytes`],
    ['Total size', `${info.totalSize.toLocaleString()} bytes`],
  ].map(([key, value]) => `<div class="meta-row"><span class="meta-key">${esc(key)}</span><span class="meta-val">${esc(value)}</span></div>`).join('');
  return {
    bodyHtml: `<style>.badge-protected{background:#5d4037;color:#fff}.protected-note{padding:12px;border-left:3px solid #8d6e63;background:#efebe9;border-radius:2px;margin:12px 0}.fv-dark .protected-note{background:#382e2a}</style>
      <div class="badge-row"><span class="badge badge-protected">Protected data</span></div>
      <div class="protected-note"><strong>This file is encrypted.</strong> Its contents were not decrypted or interpreted. Decryption requires Windows and the account or machine named by the protection descriptor.</div>
      <div class="meta-section"><h4 class="meta-section-title">Protection metadata</h4>${rows}</div>
      <p class="viewer-message">The bytes after the parsed envelope are reported as an appended encrypted payload; the viewer does not assume they are a standard CMS encrypted-content field.</p>`,
    hadUnsafe: false,
  };
}
