import { mediaInfo } from './medialib.js';

// Recognized audio/video extension or MIME -> high confidence. Cheap (no byte sniffing).
export function detect(intake) {
  const name = (intake.filename || '').toLowerCase();
  const ext = name.includes('.') ? name.split('.').pop() : '';
  if (ext === 'ts' && !intake.isBinary) return 0;
  return mediaInfo(intake).kind ? 0.95 : 0;
}
