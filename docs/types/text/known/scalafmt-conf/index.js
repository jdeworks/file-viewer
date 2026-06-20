export const plugin = {
  id: 'scalafmt-conf',
  label: '.scalafmt.conf',
  tags: ['scala', 'scalafmt', 'formatting'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === '.scalafmt.conf') return true;
    const text = intake.textSample || intake.text || '';
    if (text.includes('version = ') && text.includes('runner.dialect') && text.includes('maxColumn')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Scalafmt formatter configuration — defines formatting rules for Scala code.',
    usedFor: [{ label: 'Scalafmt', description: 'Code formatter for Scala', href: 'https://scalameta.org/scalafmt/' }],
  },
};
export default plugin;
