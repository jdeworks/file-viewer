export default {
  id: 'dendrite-config',
  label: 'Dendrite Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'dendrite.yaml' || n === 'dendrite.yml') return true;
    // match() is synchronous (js-yaml loads async) and intake.parsed is never populated at
    // detection time, so this has to be a text heuristic, not a parsed-object check.
    const text = intake.text || intake.textSample || '';
    return /^global:/m.test(text) && /server_name:/.test(text) && /^client_api:/m.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Matrix Dendrite server configuration — controls server identity, database backends, client API, media API, federation, metrics, and logging.',
    usedFor: [{ label: 'Matrix Dendrite', description: 'Second-generation Matrix homeserver written in Go', href: 'https://github.com/matrix-org/dendrite' }],
  },
};
