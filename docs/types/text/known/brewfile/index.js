export default {
  id: 'brewfile',
  label: 'Brewfile',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop();
    return name === 'Brewfile';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Homebrew Brewfile — declarative macOS package manifest for taps, formulae, casks, Mac App Store apps, and VS Code extensions.',
    usedFor: [{ label: 'Homebrew Bundle', description: 'Reproducible macOS dev environment setup', href: 'https://github.com/Homebrew/homebrew-bundle' }],
  },
};
