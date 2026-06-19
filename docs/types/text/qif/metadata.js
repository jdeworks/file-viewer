export function metadata(intake) {
  const s = (intake.textSample || '').trimStart();
  if (!s.startsWith('!Type:') && !s.startsWith('!type:') && !s.startsWith('!Account')) return {};
  const typeMatch = s.match(/^!Type:(\S+)/im);
  return { format: 'QIF Financial Data', accountType: typeMatch ? typeMatch[1] : undefined };
}
