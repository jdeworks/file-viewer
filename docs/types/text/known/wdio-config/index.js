export default {
  id: 'wdio-config',
  label: 'WebdriverIO Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'wdio.conf.js' || n === 'wdio.conf.ts' || n === 'wdio.conf.mjs';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'WebdriverIO test runner configuration — defines framework, browser capabilities, spec patterns, reporters, and concurrency settings.' },
};
