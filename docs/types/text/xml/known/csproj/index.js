// .NET project file enhancement: parses SDK-style .csproj / .vbproj / .fsproj XML,
// surfacing target framework, package references, project references, and key build settings.
export default {
  id: 'csproj',
  label: '.NET Project',
  match(intake, baseType) {
    if (baseType?.id !== 'xml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n.endsWith('.csproj') || n.endsWith('.vbproj') || n.endsWith('.fsproj');
  },
  loadRenderer: () => import('./renderer.js'),
};
