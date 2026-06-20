export const plugin = {
  id: 'insomnia',
  label: 'Insomnia workspace',
  tags: ['api', 'rest', 'insomnia', 'testing'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'insomnia.yaml' || n === 'insomnia.yml' || n === '.insomnia.yaml') return true;
    // content heuristic: Insomnia v5+ export
    const t = intake.text || '';
    return /^type:\s*(Collection|Workspace|Request|Environment)/m.test(t) && /^name:/m.test(t);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Insomnia REST API client workspace or collection export — defines API requests, folders, environments, and authentication in YAML format.',
    usedFor: [{ label: 'Insomnia', description: 'The collaborative API client and design tool', href: 'https://docs.insomnia.rest/' }],
  },
};
export default plugin;
