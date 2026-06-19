import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  if (intake.isBinary) return 0; // VS .pdb files are binary
  const head = (intake.textSample || '').slice(0, 600);
  const hasHeader = /^HEADER\s/m.test(head);
  const hasAtom = /^(?:ATOM|HETATM)\s/m.test(head);
  if (hasExtension(intake, 'pdb', 'ent')) {
    if (hasHeader || hasAtom) return 0.96;
    return 0.5; // extension alone — might be VS pdb (but those are binary)
  }
  if (hasHeader && hasAtom) return 0.90;
  if (hasHeader || hasAtom) return 0.50;
  return 0;
}
