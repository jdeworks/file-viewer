export default {
  id: 'etc-environment',
  label: '/etc/environment',
  tags: ['linux', 'environment', 'system', 'configuration'],
  match(intake) {
    const fullPath = (intake.name || intake.filename || '');
    const n = fullPath.split('/').pop().toLowerCase();
    // Exact /etc/environment or /etc/default/* pattern
    if (n === 'environment' && /\/etc\//.test(fullPath)) return true;
    // Common /etc/default/ files like grub, locale, keyboard
    if (/\/etc\/default\//.test(fullPath)) {
      const text = intake.textSample || intake.text || '';
      // Must contain KEY=value assignments (not shell functions, not just comments)
      return /^[A-Z_][A-Z_0-9]*=/.test(text.replace(/^#[^\n]*\n/mg, '').trim());
    }
    // /etc/locale.conf (systemd locale file)
    if (n === 'locale.conf' && /\/etc\//.test(fullPath)) return true;
    // Bare filename "environment" with pure KEY=VALUE content (no shell syntax)
    if (n === 'environment') {
      const text = intake.textSample || intake.text || '';
      // Must have KEY=VALUE lines and NOT use shell expansions ($VAR, `cmd`) or export
      if (/^[A-Z_][A-Z_0-9]*=/.test(text) && !text.includes('export ') && !text.includes('$(') && !/\$[A-Z_]/.test(text)) return true;
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: '/etc/environment — system-wide environment variables set for all processes, using simple KEY=VALUE syntax (no shell expansion).',
    usedFor: [{ label: 'PAM env module', description: 'pam_env reads /etc/environment for system-wide env vars', href: 'https://man.archlinux.org/man/pam_env.8' }],
  },
};
