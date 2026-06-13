import { hasExtension, mimeMatches } from '../../core/detect.js';

// .eml / message-rfc822, or text that opens with several RFC 822 headers.
export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, 'eml')) return 0.95;
  if (mimeMatches(intake, 'message/rfc822', 'eml')) return 0.9;
  const t = intake.textSample || '';
  let hits = 0;
  if (/^from:\s/im.test(t)) hits++;
  if (/^to:\s/im.test(t)) hits++;
  if (/^subject:\s/im.test(t)) hits++;
  if (/^date:\s/im.test(t)) hits++;
  if (/^(mime-version|received|message-id|content-type):\s/im.test(t)) hits++;
  return hits >= 3 ? Math.min(0.7, 0.2 + hits * 0.12) : 0;
}
