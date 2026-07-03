// Mask account/IBAN numbers to the last 4 characters — same convention as the renderer and the
// sibling OFX viewer, so the metadata side panel never leaks the full account number either.
function maskAccount(acct) {
  const s = String(acct || '').trim();
  return s.length > 4 ? '****' + s.slice(-4) : s ? '****' : '';
}

export function metadata(intake) {
  const s = (intake.textSample || '').trimStart();
  if (!/:20:/.test(s)) return {};
  const accountMatch = s.match(/:25:\s*([^\r\n]+)/);
  return { format: 'MT940 Bank Statement', account: accountMatch ? maskAccount(accountMatch[1].trim()) : undefined };
}
