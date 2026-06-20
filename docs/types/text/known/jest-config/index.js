export const plugin = {
  id: 'jest-config',
  label: 'Jest Config',
  tags: ['jest', 'testing', 'javascript'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'jest.config.js' || n === 'jest.config.ts' || n === 'jest.config.mjs' || n === 'jest.config.cjs';
  },
  renderer: () => import('./renderer.js'),
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'jest.config.js — Jest test runner configuration: defines test environment, transforms, module aliases, setup files, and coverage thresholds.',
    usedFor: [{ label: 'JavaScript testing', description: 'Delightful JavaScript testing framework configuration (JS/TS/ESM format)', href: 'https://jestjs.io/docs/configuration' }],
  },
};
export default plugin;
