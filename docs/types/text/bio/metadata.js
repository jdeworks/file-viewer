import { parseFasta, parseFastq, parseVcf } from './renderer.js';

export async function extractMetadata(intake) {
  const text = intake.text || '';
  const fields = [];
  const head = text.slice(0, 400);

  if (/^##fileformat=VCF/i.test(head) || (intake.filename || '').match(/\.(vcf|bcf)$/i)) {
    const { variants, contigs, fileformat } = parseVcf(text);
    if (fileformat) fields.push({ label: 'Format', value: fileformat });
    fields.push({ label: 'Variants', value: String(variants.length) });
    if (contigs.length) fields.push({ label: 'Contigs', value: contigs.slice(0, 10).join(', ') + (contigs.length > 10 ? '…' : '') });
    return { fields };
  }

  const ext = (intake.filename || '').split('.').pop().toLowerCase();
  if (['fq', 'fastq'].includes(ext) || (/^@/.test(head) && /^\+/m.test(head))) {
    const { records, totalLen, avgQual } = parseFastq(text);
    fields.push({ label: 'Reads', value: String(records.length) });
    fields.push({ label: 'Total bases', value: totalLen.toLocaleString() });
    if (records.length) fields.push({ label: 'Avg read length', value: String(Math.round(totalLen / records.length)) });
    if (avgQual) fields.push({ label: 'Avg quality', value: 'Q' + avgQual });
    return { fields };
  }

  // FASTA
  const { seqs, totalLen, gcContent } = parseFasta(text);
  fields.push({ label: 'Sequences', value: String(seqs.length) });
  fields.push({ label: 'Total residues', value: totalLen.toLocaleString() });
  if (seqs.length) fields.push({ label: 'Avg length', value: String(Math.round(totalLen / seqs.length)) });
  if (gcContent !== null) fields.push({ label: 'GC content', value: gcContent + '%' });
  return { fields };
}
