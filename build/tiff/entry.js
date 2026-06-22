// Build input for the vendored UTIF bundle. NOT shipped to docs/.
// esbuild concatenates UTIF (and any deps) into a single same-origin ESM file:
// docs/vendor/utif/utif.esm.js — see build.mjs in this folder.
//
// UTIF (MIT, by Ivan Kuckir / Photopea) decodes TIFF in pure JS — browsers can't
// decode TIFF natively (Chromium/Firefox). The page's decode-tiff.js uses:
//   UTIF.decode(buffer)            -> array of IFDs (one per page/sub-image)
//   UTIF.decodeImage(buffer, ifd)  -> populates ifd with raw pixel data
//   UTIF.toRGBA8(ifd)              -> Uint8Array RGBA (ifd.width × ifd.height)
import UTIF from 'utif';
export default UTIF;
