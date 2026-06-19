import { hasExtension } from '../../../core/detect.js';

const FASTA_EXT = ['fa', 'fasta', 'fna', 'faa', 'ffn', 'frn', 'fsa', 'mpfa'];
const FASTQ_EXT = ['fq', 'fastq'];
const VCF_EXT = ['bcf'];
const GFF_EXT = ['gff', 'gff3', 'gtf'];
const BED_EXT = ['bed'];

export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, ...FASTA_EXT)) return 0.92;
  if (hasExtension(intake, ...FASTQ_EXT)) return 0.92;
  if (hasExtension(intake, ...VCF_EXT)) return 0.92;
  if (hasExtension(intake, ...GFF_EXT)) return 0.88;
  if (hasExtension(intake, ...BED_EXT)) return 0.82;
  const head = (intake.text || '').slice(0, 600);
  if (/^>[\w\s]/.test(head)) return 0.75;           // FASTA >header
  if (/^@[\w\s]/.test(head) && /^\+/m.test(head)) return 0.7;  // FASTQ @header + +
  if (/^##fileformat=VCF/i.test(head)) return 0.85; // VCF meta
  if (/^##gff-version/i.test(head)) return 0.82;    // GFF
  return 0;
}
