import { hasExtension } from '../../core/detect.js';

// Unix mbox mailboxes (multiple RFC822 messages). Extension is the strong signal; a content sniff
// catches extensionless mailboxes ("From " envelope line + mail headers).
export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, 'mbox')) return 0.95;
  const t = intake.textSample || '';
  if (/^From .+\n(?:[\s\S]*?\n)?(?:From:|Subject:|Date:)/m.test(t)) return 0.55;
  return 0;
}
