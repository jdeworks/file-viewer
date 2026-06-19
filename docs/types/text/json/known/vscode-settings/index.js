export default {
  id: 'vscode-settings',
  label: 'VS Code settings',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const p = (intake.filename || '').toLowerCase().replace(/\\/g, '/');
    const name = p.split('/').pop();
    return (p.includes('/.vscode/') && name === 'settings.json') || name === 'vscode-settings.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'VS Code workspace settings — per-project editor configuration, formatter defaults, and extension settings.',
    usedFor: [{ label: 'Editor config', description: 'Workspace-level VS Code settings', href: 'https://code.visualstudio.com/docs/getstarted/settings' }],
  },
};
