export default {
  id: 'metro-config',
  label: 'Metro (React Native)',
  match(intake) {
    const n = (intake.name || '').toLowerCase();
    return n === 'metro.config.js' || n === 'metro.config.ts';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Metro bundler configuration for React Native — transformer, resolver, server, and file extension settings.' },
};
