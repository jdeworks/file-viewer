export default {
  id: 'sudoers',
  label: 'sudoers',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'sudoers' || n === 'sudoers.d' || n.endsWith('.sudoers')) return true;
    if (text.includes('ALL=(ALL') && (text.includes('NOPASSWD') || text.includes('ALL) ALL'))) return true;
    if (text.includes('Defaults') && text.includes('env_reset') && text.includes('ALL=')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Sudo access control rules — specifies which users and groups can run which commands as which users.',
    usedFor: [{ label: 'sudo', description: 'Allows permitted users to run commands as superuser', href: 'https://www.sudo.ws/' }],
  },
};
