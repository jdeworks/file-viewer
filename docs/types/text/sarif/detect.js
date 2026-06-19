export function detect(intake) {
  const { filename, text, textSample, mimeType } = intake;
  const ext = (filename || '').split('.').pop().toLowerCase();
  const isSarifExt = ext === 'sarif';
  const src = (text || textSample || '').trimStart();
  if (!src.startsWith('{')) return isSarifExt ? 0.5 : 0;
  const hasSarifSchema = src.includes('"$schema"') && src.includes('sarif');
  const hasRuns = /"runs"\s*:/.test(src) && /"results"\s*:/.test(src);
  const hasSarifVersion = /"version"\s*:\s*"2\.\d+\.\d+"/.test(src) && hasRuns;
  if (isSarifExt && hasSarifVersion) return 0.99;
  if (isSarifExt && hasRuns) return 0.95;
  if (hasSarifSchema && hasRuns) return 0.97;
  if (hasSarifVersion) return 0.9;
  if (isSarifExt) return 0.6;
  return 0;
}
