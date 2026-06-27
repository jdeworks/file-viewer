// Image clipboard for the editor's copy/paste. The in-memory canvas (setClip/getClip)
// always works — offline, no permission prompt — and is the primary path. On top of it
// we make a BEST-EFFORT attempt at the OS clipboard so you can copy a cut-out OUT to
// other apps and paste an external image IN; any failure (unsupported / denied / not a
// secure context) is swallowed and the internal clipboard carries the feature.

let clip = null;
export function setClip(canvas) { clip = canvas; }
export function getClip() { return clip; }

export async function copyToSystem(canvas) {
  try {
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
    if (blob && navigator.clipboard?.write && window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    }
  } catch { /* best effort — internal clipboard already holds it */ }
}

export async function readFromSystem() {
  try {
    if (!navigator.clipboard?.read) return null;
    for (const item of await navigator.clipboard.read()) {
      const type = item.types.find((t) => t.startsWith('image/'));
      if (type) return await blobToCanvas(await item.getType(type));
    }
  } catch { /* best effort / permission denied */ }
  return null;
}

async function blobToCanvas(blob) {
  const bmp = await createImageBitmap(blob);
  const c = document.createElement('canvas');
  c.width = bmp.width; c.height = bmp.height;
  c.getContext('2d').drawImage(bmp, 0, 0);
  return c;
}
