export default {
  id: 'justfile',
  label: 'Justfile',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'justfile' || n === '.justfile') return true;
    // Defer to the dedicated exim4.conf plugin (its recipe-like `:` lines false-match).
    if (n === 'exim4.conf') return false;
    // Exclude YAML files — they have their own plugins (Taskfile, etc.)
    if (n.endsWith('.yml') || n.endsWith('.yaml')) return false;
    const text = intake.textSample || intake.text || '';
    // Just recipes: `recipe-name arg:` followed by indented commands
    if (text.match(/^[a-z][\w-]*(\s+\S+)*:$/m) && text.includes('{{')) return true;
    if (text.match(/^set \w+ := /m) && text.match(/^[a-z][\w-]*.*:$/m)) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Just command runner — task automation recipes similar to make but simpler.',
    tags: ['just', 'justfile', 'build', 'automation', 'config'],
  },
};
