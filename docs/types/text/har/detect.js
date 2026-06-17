import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  if (intake.isBinary) return 0;
  const text = (intake.text || '').trim();
  if (text.startsWith('{') && text.includes('"log"') && text.includes('"entries"')) {
    try {
      const obj = JSON.parse(text);
      if (obj?.log?.version && Array.isArray(obj.log.entries)) return 0.92;
    } catch {}
  }
  if (hasExtension(intake, 'har')) return 0.80;
  return 0;
}
