export default {
  id: 'playwright-config',
  label: 'Playwright Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return /^playwright\.config\.(js|ts|mjs|cjs)$/.test(n);
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Playwright end-to-end test configuration — defines browsers, test directories, timeouts, reporters, and web server settings.' },
};
