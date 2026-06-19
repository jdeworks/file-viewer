export default {
  id: 'vscode-extensions',
  label: 'VS Code extensions',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const p = (intake.filename || '').toLowerCase().replace(/\\/g, '/');
    const name = p.split('/').pop();
    return (p.includes('/.vscode/') && name === 'extensions.json') || name === 'vscode-extensions.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'VS Code recommended extensions — lists extensions the workspace suggests installing for contributors.',
    usedFor: [{ label: 'Extension recommendations', description: 'Workspace extension suggestions', href: 'https://code.visualstudio.com/docs/editor/extension-marketplace#_workspace-recommended-extensions' }],
  },
};
