// Lazy TIFF decoder. Browsers can't decode TIFF natively (Chromium/Firefox), so we
// decode in JS via the vendored UTIF bundle (MIT, same-origin, no CDN/runtime fetch).
// This module + the ~84 KB UTIF bundle only load when a .tiff is actually opened.
// Returns the FIRST page/sub-image as { data: Uint8ClampedArray RGBA, width, height }.

let libPromise = null;
function lib() {
  if (!libPromise) libPromise = import('../../../vendor/utif/utif.esm.js').then((m) => m.default);
  return libPromise;
}

export async function decodeTiff(bytes) {
  const UTIF = await lib();
  // UTIF wants an ArrayBuffer; slice so we pass exactly this view's bytes.
  const ab = bytes instanceof Uint8Array
    ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    : bytes;
  const ifds = UTIF.decode(ab);
  if (!ifds || !ifds.length) throw new Error('no TIFF pages found');
  const ifd = ifds[0];
  UTIF.decodeImage(ab, ifd);
  const rgba = UTIF.toRGBA8(ifd);
  if (!ifd.width || !ifd.height || !rgba || !rgba.length) throw new Error('TIFF decoded to an empty image');
  return { data: new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength), width: ifd.width, height: ifd.height };
}
