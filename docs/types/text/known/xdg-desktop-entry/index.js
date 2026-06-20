export const plugin = {
  id: 'xdg-desktop-entry',
  label: 'Desktop Entry',
  tags: ['linux', 'freedesktop', 'xdg', 'desktop', 'launcher'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!name.endsWith('.desktop')) return false;
    const text = intake.text || '';
    return /\[Desktop Entry\]/.test(text) && /^Type=/m.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'XDG Desktop Entry file — a freedesktop.org standard for defining application launchers, directory entries, and links on Linux desktops.',
    usedFor: [
      { label: 'Desktop Entry Specification', description: 'Official freedesktop.org specification for .desktop files', href: 'https://specifications.freedesktop.org/desktop-entry-spec/latest/' },
    ],
  },
};
export default plugin;
