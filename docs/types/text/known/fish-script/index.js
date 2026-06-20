export const plugin = {
  id: 'fish-script',
  label: 'Fish Script',
  tags: ['fish', 'shell', 'script', 'config'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.fish')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Fish (Friendly Interactive Shell) script. .fish files define functions, variables, event handlers, and abbreviations for the fish shell.',
    usedFor: [
      { label: 'Fish Shell', description: 'Friendly interactive shell', href: 'https://fishshell.com/' },
    ],
  },
};
export default plugin;
