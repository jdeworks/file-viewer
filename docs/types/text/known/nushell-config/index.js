export default {
  id: 'nushell-config',
  label: 'Nushell Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    // Well-known Nushell filenames
    if (n === 'config.nu' || n === 'env.nu' || n === 'login.nu') return true;
    // Content heuristic for other .nu files
    const text = intake.textSample || intake.text || '';
    if (text.includes('$env.config') || text.includes('use std') || text.includes('let-env')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Nushell shell configuration — defines settings, keybindings, menus, aliases, and custom commands for the Nu shell.',
    usedFor: [{ label: 'Nushell', description: 'A new type of shell that works with structured data', href: 'https://www.nushell.sh/' }],
  },
};
