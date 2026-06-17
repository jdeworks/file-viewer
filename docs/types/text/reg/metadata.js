export function extractMetadata(intake) {
  const text = intake.text || '';
  const keyMatches = text.match(/^\[/gm) || [];
  const valueMatches = text.match(/^"[^"]*"\s*=/gm) || [];
  const version = (text.match(/^(Windows Registry Editor.*|REGEDIT4)/m) || [])[1] || 'Unknown';
  return { version, keyCount: keyMatches.length, valueCount: valueMatches.length };
}
