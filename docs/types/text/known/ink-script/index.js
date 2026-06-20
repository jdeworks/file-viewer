export const plugin = {
  id: 'ink-script',
  label: 'Ink Story',
  tags: ['ink', 'inkle', 'narrative', 'interactive fiction', 'ink2'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!name.endsWith('.ink') && !name.endsWith('.ink2')) return false;
    const text = (intake.text || '').slice(0, 2000);
    if (!text.includes('->') && !text.includes('===') && !text.includes('VAR ')) return null;
    return true;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Ink is a scripting language for writing interactive narrative games and stories. Developed by Inkle Studios, it powers games like "80 Days" and "Heaven\'s Vault".',
    usedFor: [
      { label: 'inklestudios.com/ink', description: 'Official Ink language home', href: 'https://www.inklestudios.com/ink/' },
      { label: 'Ink on GitHub', description: 'Ink source and documentation', href: 'https://github.com/inkle/ink' },
    ],
  },
};
export default plugin;
