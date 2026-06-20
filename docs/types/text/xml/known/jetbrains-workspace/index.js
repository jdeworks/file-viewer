// JetBrains workspace.xml enhancement: surfaces run configurations, changed files, and VCS info.
export default {
  id: 'jetbrains-workspace',
  label: 'JetBrains Workspace',
  match: (intake, baseType) =>
    baseType.id === 'xml'
    && /(^|\/)workspace\.xml$/.test(intake.filename || '')
    && (intake.text || '').includes('<project')
    && (intake.text || '').includes('<component name="'),
  loadRenderer: () => import('./renderer.js'),
};
