export async function loadMetadata(intake) {
  const text = intake.text || '';
  const pkgMatch = text.match(/^package\s+([\w.]+)/m);
  const syntaxMatch = text.match(/^syntax\s*=\s*["'](\w+)["']/m);
  const messages = (text.match(/^message\s+\w+/mg) || []).length;
  const services = (text.match(/^service\s+\w+/mg) || []).length;
  return {
    package: pkgMatch ? pkgMatch[1] : null,
    syntax: syntaxMatch ? syntaxMatch[1] : 'proto2',
    messageCount: messages,
    serviceCount: services,
  };
}
