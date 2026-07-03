// GFF3: General Feature Format v3 — starts with ##gff-version 3
// GFF2/GTF: starts with ##gff-version 2 or tab-delimited with 9 columns starting with seqname

export function detect(intake) {
  const { filename, textSample } = intake;
  const ext = filename ? filename.split('.').pop().toLowerCase() : '';
  const isGffExt = ext === 'gff' || ext === 'gff3' || ext === 'gtf' || ext === 'gff2';

  if (!textSample) return isGffExt ? 0.4 : 0;

  const s = textSample.trimStart();
  if (/^##gff-version\s+3/i.test(s)) return isGffExt ? 0.99 : 0.96;
  if (/^##gff-version\s+2/i.test(s)) return isGffExt ? 0.99 : 0.94;
  if (/^##gff-version/i.test(s)) return isGffExt ? 0.97 : 0.90;

  // GTF/GFF2: 9 tab-separated columns with gene_id / transcript_id in col 9.
  // Most real GTF files (e.g. Ensembl) never carry a ##gff-version directive, so this is
  // the common case for .gtf — score above the bio module's flat 0.88 extension match
  // (docs/types/text/bio/detect.js) so this dedicated viewer keeps winning for real files.
  if (isGffExt) {
    const firstData = s.split('\n').find(l => !l.startsWith('#') && l.includes('\t'));
    if (firstData && firstData.split('\t').length >= 9) return 0.90;
    return 0.5;
  }
  return 0;
}
