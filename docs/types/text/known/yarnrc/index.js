export default {
  id: 'yarnrc',
  label: 'Yarn Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === '.yarnrc' || n === '.yarnrc.yml' || n === '.yarnrc.yaml') return true;
    if (text.includes('nodeLinker:') || text.includes('yarnPath:') || text.includes('npmRegistryServer:')) return true;
    if (n === '.yarnrc' && (text.includes('registry ') || text.includes('yarn-path '))) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Yarn package manager configuration — controls registry, workspace settings, PnP mode, and other package resolution behavior.',
    usedFor: [{ label: 'Yarn', description: 'Fast, reliable, and secure package manager for JavaScript', href: 'https://yarnpkg.com/' }],
  },
};
