import { hasExtension } from '../../../core/detect.js';
export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, 'thrift')) return 0.96;
  const t = (intake.textSample || '');
  if ((t.includes('namespace ') || t.includes('struct ') || t.includes('service ')) && t.includes('typedef ') || t.includes('exception ')) return 0.5;
  return 0;
}
