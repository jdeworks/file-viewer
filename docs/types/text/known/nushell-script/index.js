export const plugin = {
  id: 'nushell-script',
  label: 'Nushell Script',
  tags: ['nushell', 'nu', 'shell', 'script'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!name.endsWith('.nu')) return false;
    // Well-known config filenames go to nushell-config
    if (name === 'config.nu' || name === 'env.nu' || name === 'login.nu') return false;
    const text = intake.textSample || intake.text || '';
    // Scripts have def/export def; configs lean heavily on $env.
    if (/^\s*(?:export\s+)?def\s+/m.test(text)) return true;
    // If it has $env. but no def, it's probably a config — skip
    if (/\$env\.config/.test(text) || /\$env\./.test(text)) return false;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Nushell script file. .nu scripts define commands with `def`, export public commands, declare type-checked parameters, and pipeline-compose structured data.',
    usedFor: [
      { label: 'Nushell', description: 'A new type of shell that works with structured data', href: 'https://www.nushell.sh/' },
    ],
  },
};
export default plugin;
