import { hasExtension } from '../../../core/detect.js';

const EXTS = ['kicad_sch', 'kicad_pcb', 'kicad_pro', 'kicad_mod', 'kicad_sym', 'kicad_wks', 'kicad_dru', 'kicad_prl'];

export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, ...EXTS)) return 0.97;
  const head = (intake.text || '').slice(0, 200);
  if (/^\(kicad_sch\b|\(kicad_pcb\b|\(kicad_pro\b|\(kicad_symbol_lib\b|\(module\b/m.test(head)) return 0.9;
  return 0;
}
