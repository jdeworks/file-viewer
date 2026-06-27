// Public facade for the shared OCR capability. Lanes import from here.
//   import { recognize, ocrVideo, FORMATS, bundleInfo } from '../../core/ocr/index.js';
// See ./README.md for the integration contract (image lane + media lane).
export { recognize, terminate, isLoaded, bundleInfo, DIGITS_WHITELIST } from './engine.js';
export { ocrVideo, ocrFrames, sampleTimes } from './frames.js';
export { toSRT, toVTT, toText, toJSON, fmtSRT, fmtVTT, download } from './subtitles.js';

import { toSRT, toVTT, toText, toJSON } from './subtitles.js';

// Export-format registry for the media lane's format picker.
export const FORMATS = {
  srt: { ext: 'srt', mime: 'text/plain', label: 'SubRip (.srt)', fn: toSRT },
  vtt: { ext: 'vtt', mime: 'text/vtt', label: 'WebVTT (.vtt)', fn: toVTT },
  txt: { ext: 'txt', mime: 'text/plain', label: 'Plain text', fn: toText },
  json: { ext: 'json', mime: 'application/json', label: 'JSON', fn: toJSON },
};
