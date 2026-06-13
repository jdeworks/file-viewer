import { hasExtension, mimeMatches } from '../../core/detect.js';

// .docx is a zip; rely on extension/MIME (old binary .doc is not supported by mammoth).
export function detect(intake) {
  if (hasExtension(intake, 'docx', 'dotx')) return 0.95;
  if (mimeMatches(intake, 'wordprocessingml', 'msword')) return 0.9;
  return 0;
}
