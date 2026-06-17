export function extractMetadata(intake) {
  const text = intake.text || '';
  const get = (key) => { const m = text.match(new RegExp(`^${key}:\\s*(.+)`, 'm')); return m?.[1]?.trim(); };
  return {
    process: get('Process'),
    version: get('Version'),
    exceptionType: get('Exception Type'),
    osVersion: get('OS Version'),
    date: get('Date/Time'),
    triggeredBy: get('Triggered by Thread'),
  };
}
