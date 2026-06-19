export default {
  id: 'tailwind',
  label: 'Tailwind CSS Config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'tailwind.config.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Tailwind CSS configuration — content paths, theme extensions, and plugins.' },
};
