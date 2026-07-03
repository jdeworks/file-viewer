import { hasExtension } from '../../../core/detect.js';

// HL7 v2.x messages start with MSH segment using pipe delimiter, followed by the
// (usually 4-char) encoding-characters field, e.g. `MSH|^~\&|...`. Use `+` so the
// whole encoding-characters run is consumed, not just its first character — a bare
// (unquantified) class here never matches real MSH headers.
const MSH_RE = /^MSH\|[\^~\\&]+\|/m;

export function detect(intake) {
  if (intake.isBinary) return 0;
  const ext = (intake.filename || '').split('.').pop().toLowerCase();
  if (['hl7', 'hl7v2', 'msh'].includes(ext)) return 0.92;
  const t = intake.textSample || '';
  if (MSH_RE.test(t)) return 0.96;
  return 0;
}
