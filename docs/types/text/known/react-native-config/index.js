export default {
  id: 'react-native-config',
  label: 'React Native CLI',
  match(intake) {
    const n = (intake.name || '').toLowerCase();
    return n === 'react-native.config.js' || n === 'react-native.config.ts';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'React Native CLI configuration — native dependencies, platform overrides, registered assets, and project-level settings.' },
};
