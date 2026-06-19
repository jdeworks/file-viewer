export default {
  id: 'gae-app',
  label: 'Google App Engine',
  match: (intake, baseType) => {
    if (baseType?.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    if (name !== 'app.yaml') return false;
    // Content-based guard: must look like a GAE config
    const text = intake.text || '';
    return /\bruntime\s*:/m.test(text) || /\bservice\s*:/m.test(text) || /\benv\s*:\s*(standard|flex)/m.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Google App Engine configuration — runtime, service name, environment, URL handlers, and scaling settings.',
    usedFor: [{ label: 'PaaS deployment', description: 'Deploy apps to Google App Engine', href: 'https://cloud.google.com/appengine/docs/standard/reference/app-yaml' }],
  },
};
