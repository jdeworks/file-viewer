export default {
  id: 'storybook',
  label: 'Storybook config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const fn = intake.filename || '';
    const name = fn.split('/').pop().toLowerCase();
    if (name === 'storybook.config.json' || name === 'storybook.main.json') return true;
    return name === 'main.json' && /\.storybook[\\/]/i.test(fn);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Storybook configuration — shows stories glob, addons, and framework.',
    usedFor: [{ label: 'Component development', description: 'Storybook UI component sandbox configuration', href: 'https://storybook.js.org/docs/configure' }],
  },
};
