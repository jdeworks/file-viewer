import { hasExtension, mimeMatches } from '../../core/detect.js';

// .pptx/.ppsx are zips; rely on extension/MIME (legacy binary .ppt isn't supported).
export function detect(intake) {
  if (hasExtension(intake, 'pptx', 'ppsx', 'pptm')) return 0.95;
  if (mimeMatches(intake, 'presentationml', 'powerpoint')) return 0.9;
  return 0;
}
