export default {
  id: 'postcss',
  label: 'PostCSS Config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'postcss.config.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'PostCSS configuration — plugin pipeline for CSS transformation.' },
};
