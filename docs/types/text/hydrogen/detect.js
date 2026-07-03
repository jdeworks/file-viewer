import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, 'h2song', 'h2pattern', 'h2drumkit')) return 0.9;
  const t = intake.textSample || '';
  // `[^"]*` stops at the closing quote of the `version` attribute value, so it can
  // never reach the "hydrogen" that actually shows up later in the tag (e.g. the
  // hydrogen-music.org xsi:noNamespaceSchemaLocation URL) — real .h2song files never
  // matched this branch. Use `[^>]*` to scan the whole opening tag instead.
  if (/<hydrogen_drumkit>/i.test(t) || /<song[^>]*hydrogen/i.test(t)) return 0.97;
  return 0;
}
