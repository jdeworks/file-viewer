export const plugin = {
  id: 'cue-lang',
  label: 'CUE',
  tags: ['cue', 'configuration', 'validation', 'schema'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    if (!name.endsWith('.cue')) return false;
    const text = intake.text || '';
    // CUE sheet files have FILE "..." and TRACK lines near the top — skip them
    const head = text.slice(0, 2048);
    if (/^FILE\s+"/im.test(head) && /^TRACK\s+/im.test(head)) return false;
    // CUE lang files: must have `package ` or `import "` or field constraints (`:`) without being a CUE sheet
    if (/^\s*package\s+\w/m.test(text)) return true;
    if (/^\s*import\s+"/m.test(text)) return true;
    if (/:\s/.test(text) && !/^FILE\s+/im.test(head)) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'CUE is an open-source data validation language and inference engine with its roots in logic programming, used for configuration, schema definition, and data validation.',
    usedFor: [{ label: 'cuelang.org', description: 'The CUE configuration language', href: 'https://cuelang.org/' }],
  },
};
export default plugin;
