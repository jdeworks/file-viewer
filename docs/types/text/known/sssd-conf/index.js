export const plugin = {
  id: 'sssd-conf',
  label: 'SSSD',
  tags: ['sssd', 'ldap', 'authentication', 'identity', 'linux', 'kerberos'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name === 'sssd.conf') return true;
    const text = intake.text || '';
    return /^\[sssd\]/m.test(text) && (/domains\s*=/m.test(text) || /services\s*=/m.test(text));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'SSSD (System Security Services Daemon) configuration file — provides access to identity and authentication resources.',
    usedFor: [
      { label: 'SSSD documentation', description: 'Official SSSD project documentation', href: 'https://sssd.io/docs/introduction.html' },
      { label: 'sssd.conf man page', description: 'sssd.conf configuration reference', href: 'https://linux.die.net/man/5/sssd.conf' },
    ],
  },
};
export default plugin;
