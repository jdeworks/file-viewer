import { mediaInfo } from './medialib.js';

// Recognized audio/video extension or MIME -> high confidence. Cheap (no byte sniffing).
export function detect(intake) {
  return mediaInfo(intake).kind ? 0.95 : 0;
}
