export const plugin = {
  id: 'elvish-script',
  label: 'Elvish Script',
  tags: ['elvish', 'elv', 'shell', 'script'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return name.endsWith('.elv');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Elvish is a modern, expressive shell scripting language with structured data, exceptions, and pipelines. .elv files contain Elvish code.',
    usedFor: [
      { label: 'Elvish Shell', description: 'Friendly interactive shell and scripting language', href: 'https://elv.sh/' },
    ],
  },
};
export default plugin;
