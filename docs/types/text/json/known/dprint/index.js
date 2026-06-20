export default {
  id: 'dprint',
  label: 'dprint config',
  tags: ['formatter', 'code-style'],
  match(intake, baseType) {
    if (!baseType || baseType.id !== 'json') return false;
    const n = (intake.filename || '').split('/').pop().toLowerCase();
    return n === 'dprint.json' || n === '.dprint.json' || n === 'dprint.jsonc';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'dprint code formatter configuration — defines plugins, include/exclude globs, and per-plugin formatting rules.',
    usedFor: [
      { label: 'Code formatting', description: 'Fast pluggable code formatter supporting TypeScript, JSON, Markdown, TOML, and more', href: 'https://dprint.dev/config/' },
    ],
  },
};
