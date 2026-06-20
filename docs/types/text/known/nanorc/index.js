// GNU nano editor config (.nanorc) — sets behaviour, colors, syntax includes, and key bindings.
export default {
  id: 'nanorc',
  label: 'nanorc',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.nanorc' || n === 'nanorc' || n.endsWith('.nanorc');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: '.nanorc — GNU nano editor configuration: behaviour flags, tab settings, color themes, syntax highlighting includes, and custom key bindings.',
    usedFor: [{ label: 'GNU nano config', description: 'Configure the nano terminal text editor', href: 'https://www.nano-editor.org/dist/latest/nanorc.5.html' }],
  },
};
