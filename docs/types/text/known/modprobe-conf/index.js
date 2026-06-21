export default {
  id: 'modprobe-conf',
  label: 'modprobe Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    // Defer to dedicated plugins for these specific configs (share blacklist/options-like syntax).
    if (n === 'named.conf' || n === 'ranger.conf' || n === 'wsl.conf') return false;
    if (n === 'modprobe.conf' || n === 'modules.conf') return true;
    if (n.endsWith('.conf') && text.match(/^(blacklist|options|alias|install|remove)\s+\S/m)) return true;
    if (text.includes('blacklist ') && (text.includes('options ') || text.includes('alias '))) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Kernel module configuration — controls which kernel modules are blacklisted, what options they receive, and module aliases.',
    usedFor: [{ label: 'modprobe', description: 'Linux kernel module loading and configuration', href: 'https://linux.die.net/man/5/modprobe.d' }],
  },
};
