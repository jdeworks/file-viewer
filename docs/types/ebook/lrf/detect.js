import { hasExtension } from '../../../core/detect.js';

// Sony LRF (BBeB / Broad Band eBook) — the old Sony Reader format. Detected by extension and its
// "L\0R\0F\0\0\0" magic. We don't decode the proprietary BBeB stream yet (see the renderer note),
// but recognizing it gives a clear message instead of a raw hex dump.
export function detect(intake) {
  if (hasExtension(intake, 'lrf')) return 0.95;
  if (hasExtension(intake, 'lrx')) return 0.95;          // DRM'd Sony book → reader shows a clear refusal
  const b = intake.bytes;
  if (b && b.length >= 8 && b[0] === 0x4c && b[1] === 0x00 && b[2] === 0x52 && b[3] === 0x00 && b[4] === 0x46 && b[5] === 0x00) return 0.6;
  return 0;
}
