// Image exports (Layer-2 `loadExports` hook): convert/download the image as PNG / JPEG / WebP via
// canvas.toBlob — zero dependency. SVG additionally offers "download original" + rasterize-to-PNG.
import { downloadBlob } from '../../core/exports.js';
import { isSvg, mimeFor, dataUrl } from './imglib.js';

function loadImage(src) {
  return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src; });
}

async function convertAndDownload(intake, type, ext, quality) {
  const svg = isSvg(intake);
  const src = svg ? dataUrl(intake) : URL.createObjectURL(new Blob([intake.bytes], { type: mimeFor(intake) }));
  try {
    const img = await loadImage(src);
    const w = img.naturalWidth || 1024, h = img.naturalHeight || 768;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (type === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }   // JPEG has no alpha
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise((res) => canvas.toBlob(res, type, quality));
    if (!blob) throw new Error('this browser can’t encode ' + ext.toUpperCase());
    const base = (intake.filename || 'image').replace(/\.[^.]+$/, '');
    downloadBlob(blob, base + '.' + ext, type);
  } finally { if (!svg) URL.revokeObjectURL(src); }
}

export function getExports(intake) {
  const out = [
    { label: 'Download as PNG', run: () => convertAndDownload(intake, 'image/png', 'png') },
    { label: 'Download as JPEG', run: () => convertAndDownload(intake, 'image/jpeg', 'jpg', 0.92) },
    { label: 'Download as WebP', run: () => convertAndDownload(intake, 'image/webp', 'webp', 0.92) },
  ];
  if (isSvg(intake)) out.unshift({ label: 'Download original SVG', run: () => downloadBlob(intake.bytes, intake.filename || 'image.svg', 'image/svg+xml') });
  return out;
}
