// Image helpers shared by renderer + metadata.
const EXT_MIME = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', bmp: 'image/bmp', avif: 'image/avif', ico: 'image/x-icon', svg: 'image/svg+xml',
};

export function isSvg(intake) {
  if ((intake.filename || '').toLowerCase().endsWith('.svg')) return true;
  if (intake.isBinary) return false;
  const t = (intake.text || '').trim();
  return t.startsWith('<svg') || (t.startsWith('<?xml') && t.includes('<svg'));
}

export function mimeFor(intake) {
  if ((intake.mimeType || '').startsWith('image/')) return intake.mimeType;
  const ext = (intake.filename || '').toLowerCase().split('.').pop();
  return EXT_MIME[ext] || 'application/octet-stream';
}

function bytesToBase64(bytes) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  return btoa(bin);
}

export function dataUrl(intake) {
  if (isSvg(intake)) return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(intake.text || '');
  return 'data:' + mimeFor(intake) + ';base64,' + bytesToBase64(intake.bytes);
}

// Natural pixel dimensions, via an off-DOM Image.
export function dimensions(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
