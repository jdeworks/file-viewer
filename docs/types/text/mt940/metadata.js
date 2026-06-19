export function metadata(intake) {
  const s = (intake.textSample || '').trimStart();
  if (!/:20:/.test(s)) return {};
  const accountMatch = s.match(/:25:\s*([^\r\n]+)/);
  return { format: 'MT940 Bank Statement', account: accountMatch ? accountMatch[1].trim() : undefined };
}
