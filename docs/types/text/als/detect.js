import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  const isAls = hasExtension(intake, 'als');
  if (!isAls) return 0;
  const b = intake.bytes || new Uint8Array();
  if (b.length >= 2 && b[0] === 0x1f && b[1] === 0x8b) return 0.97;
  // The .als extension is also used by the unrelated Alloy formal-specification language
  // (see docs/types/text/known/alloy-lang/, e.g. docs/examples/sample-alloy.als) — only claim
  // high confidence for plain (non-gzip) .als files that actually look like decompressed
  // Ableton Live XML, so a non-XML .als file doesn't masquerade as an Ableton set.
  const t = intake.textSample || intake.text || '';
  if (/<\?xml|<Ableton\b/.test(t)) return 0.90;
  return 0.3;
}
