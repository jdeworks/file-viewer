export const plugin = {
  id: 'bruno',
  label: 'Bruno workspace',
  tags: ['api', 'rest', 'bruno', 'testing'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'bruno.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Bruno workspace configuration — collection metadata, ignore patterns, proxy, global headers, and scripting.',
    usedFor: [{ label: 'Bruno', description: 'Open-source IDE for exploring and testing APIs.', href: 'https://www.usebruno.com/docs/' }],
  },
};
export default plugin;
