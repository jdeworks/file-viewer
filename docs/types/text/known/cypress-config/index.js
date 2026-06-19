export default {
  id: 'cypress-config',
  label: 'Cypress Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return /^cypress\.config\.(js|ts|mjs|cjs)$/.test(n) || n === 'cypress.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Cypress end-to-end and component test configuration — defines base URL, spec patterns, viewport, video, screenshots, and timeouts.' },
};
