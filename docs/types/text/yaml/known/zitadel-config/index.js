export default {
  id: 'zitadel-config',
  label: 'ZITADEL Config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'zitadel.yaml' || n === 'zitadel.yml') return true;
    // match() is synchronous, so this can't js-yaml-parse — use a text heuristic instead of
    // intake.parsed (never populated at detection time; see known-detection-gotchas memory).
    const text = intake.text || '';
    return /^ExternalDomain:/m.test(text) && /^Database:/m.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'ZITADEL identity/auth server configuration — external domain, TLS, database, and first-instance bootstrap settings.',
    usedFor: [{ label: 'ZITADEL', description: 'Open-source identity and access management platform configuration.', href: 'https://zitadel.com/docs/self-hosting/manage/configure' }],
  },
};
