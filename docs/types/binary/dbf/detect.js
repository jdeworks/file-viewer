import { hasExtension, mimeMatches } from '../../../core/detect.js';
import { validateDbf } from './validate.js';

export function detect(intake) {
  const { bytes: b } = intake;
  const isDbfExt = hasExtension(intake, 'dbf');
  const isDbfMime = mimeMatches(intake, 'dbf', 'dbase');

  if (!b || b.length < 12) return isDbfExt ? 0.6 : isDbfMime ? 0.5 : 0;
  const result = validateDbf(intake);
  if (result.valid) return isDbfExt ? 0.98 : isDbfMime ? 0.94 : 0.86;
  // Extensions remain user-overridable diagnostics for damaged/unsupported DBFs, but bytes
  // without a DBF name or MIME must pass the complete structural validator.
  if (isDbfExt) return result.versionName ? 0.68 : 0.61;
  if (isDbfMime) return result.versionName ? 0.61 : 0.54;
  return 0;
}
