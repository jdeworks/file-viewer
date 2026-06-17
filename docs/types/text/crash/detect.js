// Detect Apple crash logs (.crash classic text format, .ips JSON format from iOS 15+).
// Also catches Linux ASAN / segfault reports with partial confidence.

// Note: uses intake.isBinary (set by core/intake.js) rather than importing isBinary helper.
export function detect(intake) {
  if (intake.isBinary) return 0;
  const ext = intake.filename?.toLowerCase().split('.').pop();
  const sample = intake.textSample || '';

  // .ips files are JSON crash reports (iOS 15+)
  if (ext === 'ips') {
    try { const j = JSON.parse(intake.text || sample); if (j.crashInfo || j.threads) return 0.97; } catch {}
    return 0.7;
  }

  // Classic .crash format: starts with Incident Identifier: or has signature combo
  if (sample.includes('Incident Identifier:') ||
      (sample.includes('Process:') && sample.includes('Path:') && sample.includes('Exception Type:'))) {
    return 0.97;
  }
  if (ext === 'crash') return 0.7;

  // Linux coredump/ASAN reports
  if (sample.includes('AddressSanitizer') || sample.includes('==ERROR:') ||
      (sample.includes('Segmentation fault') && sample.includes('Thread'))) return 0.6;

  return 0;
}
