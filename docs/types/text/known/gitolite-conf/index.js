export default {
  id: 'gitolite-conf',
  label: 'Gitolite config',
  match(intake) {
    const f = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return f === 'gitolite.conf' || (intake.filename || '').replace(/\\/g, '/').endsWith('conf/gitolite.conf');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Gitolite git repository hosting configuration — defines groups, repos, and per-user/group access permissions.',
    usedFor: [
      { label: 'Gitolite', description: 'Highly customisable git server access control, managed entirely via git.', href: 'https://gitolite.com/gitolite/conf.html' },
    ],
  },
};
