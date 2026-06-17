export function detect(intake) {
  if (intake.bytes?.[0] > 127) return 0; // not ASCII/UTF-8 text
  const name = intake.filename?.toLowerCase() ?? '';
  const text = intake.textSample ?? '';

  // Strong SSH config keywords in content
  const hasHostBlock = /^host\s+\S/im.test(text);
  const hasSSHKeywords = /^\s+(hostname|identityfile|proxyjump|forwardagent|serveraliveinterval|user\s+\S)\s/im.test(text);

  // Named exactly "config" or ends with "/config" + SSH content → very likely
  const isConfigFile = name === 'config' || name.endsWith('/config');
  if (isConfigFile && hasHostBlock) return 0.92;
  if (isConfigFile && hasSSHKeywords) return 0.85;

  // ".ssh-config" or "ssh-config" as extension/name
  if (name.endsWith('.ssh-config') || name === 'ssh-config') return hasHostBlock ? 0.92 : 0.7;

  // Strong content signal alone
  if (hasHostBlock && hasSSHKeywords) return 0.75;
  if (hasHostBlock && /^\s+port\s+\d+/im.test(text)) return 0.65;

  return 0;
}
