// pip.conf / pip.ini plugin: shows index-url, extra-index-url, trusted hosts, and other options.
export default {
  id: 'pip-conf',
  label: 'pip.conf',
  match: (intake) => {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return name === 'pip.conf' || name === 'pip.ini';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'pip.conf / pip.ini — pip configuration file controlling index servers, trusted hosts, timeouts, and install options.',
    usedFor: [
      { label: 'pip config', description: 'Per-user or per-project pip configuration applied to all pip install commands', href: 'https://pip.pypa.io/en/stable/topics/configuration/' },
    ],
  },
};
