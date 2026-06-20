export const plugin = {
  id: 'elvish-script',
  label: 'Elvish Script',
  tags: ['elvish', 'elv', 'shell', 'script'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.elv')) return true;
    const text = intake.textSample || intake.text || '';
    const hits = [
      /^fn\s+\w+/m.test(text),
      /^var\s+\w+/m.test(text),
      /^use\s+\S+/m.test(text),
      /^set\s+\w+/m.test(text),
    ].filter(Boolean).length;
    return hits >= 2;
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
