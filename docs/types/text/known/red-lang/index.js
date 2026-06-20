export const plugin = {
  id: 'red-lang',
  label: 'Red',
  tags: ['red', 'rebol', 'scripting', 'functional'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.red') || name.endsWith('.reds')) return true;
    const text = intake.text || '';
    return (
      text.includes('Red [') ||
      text.includes('func [') ||
      text.includes('function [') ||
      text.includes('context [') ||
      text.includes('object [')
    );
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Red language source file — a Rebol-inspired full-stack programming language with a homoiconic syntax and built-in GUI system.',
    usedFor: [
      { label: 'Red language homepage', description: 'Official Red language documentation and downloads', href: 'https://www.red-lang.org/' },
      { label: 'Red on GitHub', description: 'Red language source code and examples', href: 'https://github.com/red/red' },
    ],
  },
};
export default plugin;
