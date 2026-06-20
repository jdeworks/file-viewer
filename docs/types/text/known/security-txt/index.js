export const plugin = {
  id: 'security-txt',
  label: 'security.txt',
  tags: ['security', 'web', 'vulnerability-disclosure'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    const basename = name.split('/').pop();
    if (basename === 'security.txt') return true;
    if (name.includes('.well-known/security.txt')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'RFC 9116 security contact file — tells security researchers how to report vulnerabilities and provides contact, policy, encryption, and expiry information.',
    usedFor: [{ label: 'RFC 9116', description: 'A File Format to Aid in Security Vulnerability Disclosure', href: 'https://www.rfc-editor.org/rfc/rfc9116' }],
  },
};
export default plugin;
