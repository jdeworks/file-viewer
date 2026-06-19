import { hasExtension, mimeMatches } from '../../core/detect.js';

// vCard contact files (.vcf / .vcard).
export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, 'vcf', 'vcard')) {
    // Yield to bioinformatics type if content looks like genomic VCF
    if (/^##fileformat=VCF/i.test(intake.textSample || '')) return 0;
    return 0.95;
  }
  if (mimeMatches(intake, 'vcard', 'x-vcard')) return 0.9;
  if (/^BEGIN:VCARD/im.test(intake.textSample || '')) return 0.85;
  return 0;
}
