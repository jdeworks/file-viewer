export default {
  id: 'cartfile',
  label: 'Carthage Cartfile',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'cartfile' || n === 'cartfile.resolved';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Carthage dependency file — lists GitHub, git, or binary dependencies with version constraints.',
    usedFor: [{ label: 'Carthage', description: 'Decentralized dependency manager for Cocoa', href: 'https://github.com/Carthage/Carthage' }],
  },
};
