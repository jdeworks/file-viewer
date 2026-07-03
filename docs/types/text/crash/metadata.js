export function extractMetadata(intake) {
  const text = intake.text || '';
  const ips = parseIpsForMetadata(text);
  if (ips) return ips;
  const get = (key) => { const m = text.match(new RegExp(`^${key}:\\s*(.+)`, 'm')); return m?.[1]?.trim(); };
  return {
    process: get('Process'),
    version: get('Version'),
    exceptionType: get('Exception Type'),
    osVersion: get('OS Version'),
    date: get('Date/Time'),
    // Classic Apple crash reports use "Crashed Thread:" (matches renderer.js's own
    // header parsing); some report variants also use "Triggered by Thread:" — check both.
    triggeredBy: get('Crashed Thread') || get('Triggered by Thread'),
  };
}

// The .ips (iOS 15+) format is JSON, not key:value text lines — the regex-based
// extraction above never matches it. Mirror renderer.js's parseIps() field mapping
// so the metadata panel isn't silently empty for JSON crash reports.
function parseIpsForMetadata(text) {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith('{')) return null;
  let obj;
  try { obj = JSON.parse(text); } catch { return null; }
  if (!obj || (!obj.crashInfo && !obj.threads)) return null;
  const ci = obj.crashInfo || {};
  const exc = ci.exception || {};
  return {
    process: obj.procName || obj.processName || undefined,
    version: obj.bundleVersion || obj.appVersion || undefined,
    exceptionType: exc.type || ci.exceptionType || undefined,
    osVersion: obj.osVersion || undefined,
    date: obj.captureTime || undefined,
    triggeredBy: (obj.faultingThread ?? ci.faultingThread) !== undefined
      ? String(obj.faultingThread ?? ci.faultingThread)
      : undefined,
  };
}
