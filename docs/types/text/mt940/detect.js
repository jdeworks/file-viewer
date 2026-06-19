// MT940/MT942: SWIFT bank statement format
// Starts with :20: (transaction reference) optionally preceded by {1: or similar FIN tags

export function detect(intake) {
  const { filename, textSample } = intake;
  const ext = filename ? filename.split('.').pop().toLowerCase() : '';
  const isMtExt = ext === 'mt940' || ext === 'mt942' || ext === 'sta' || ext === 'mt';

  if (!textSample) return isMtExt ? 0.4 : 0;

  const s = textSample.trimStart();
  // MT940/942 always starts with :20: or a FIN wrapper
  if (/^:20:/.test(s) || /^\{1:[^}]+\}\{2:[^}]+\}\{4:\s*:20:/s.test(s)) {
    return isMtExt ? 0.99 : 0.92;
  }
  if (isMtExt && /^:\d{2}[A-Z]?:/.test(s)) return 0.75;
  return isMtExt ? 0.4 : 0;
}
