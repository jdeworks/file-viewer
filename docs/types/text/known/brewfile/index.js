export const plugin = {
  id: 'brewfile',
  label: 'Brewfile',
  tags: ['homebrew', 'brew', 'macos'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'brewfile';
  },
  renderer: () => import('./renderer.js'),
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Homebrew Brewfile — declarative macOS package manifest for taps, formulae, casks, Mac App Store apps, and VS Code extensions.',
    usedFor: [{ label: 'Homebrew Bundle', description: 'Reproducible macOS dev environment setup', href: 'https://github.com/Homebrew/homebrew-bundle' }],
  },
};
export default plugin;
