export default {
  id: 'apparmor-profile',
  label: 'AppArmor Profile',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    // Files in /etc/apparmor.d/ typically named after binary path like usr.bin.firefox
    if (n.startsWith('usr.bin.') || n.startsWith('usr.sbin.') || n.startsWith('usr.lib.')) return true;
    if (text.includes('#include <tunables/global>') || text.includes('#include<tunables/global>')) return true;
    if (text.includes('profile ') && (text.includes('flags=(complain)') || text.includes('flags=(enforce)'))) return true;
    if (text.match(/^\/[a-z].*\{$/m) && (text.includes('capability') || text.includes('network') || text.includes('#include'))) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'AppArmor security profile — defines mandatory access control rules restricting file access, capabilities, and network permissions for a program.',
    usedFor: [{ label: 'AppArmor', description: 'Linux kernel security module for mandatory access control', href: 'https://apparmor.net/' }],
  },
};
