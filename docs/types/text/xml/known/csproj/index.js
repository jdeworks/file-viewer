// C# project file enhancement: parses SDK-style .csproj XML, surfacing target framework,
// package references, project references, and key build settings.
export default {
  id: 'csproj',
  label: 'C# Project',
  match(intake, baseType) {
    if (baseType?.id !== 'xml') return false;
    return (intake.name || intake.filename || '').toLowerCase().endsWith('.csproj');
  },
  loadRenderer: () => import('./renderer.js'),
};
