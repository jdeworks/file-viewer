// NuGet package specification enhancement: parses .nuspec XML, surfacing package identity,
// description, license, tags, and the dependency graph.
export default {
  id: 'nuspec',
  label: 'NuGet Package Spec',
  match(intake, baseType) {
    if (baseType?.id !== 'xml') return false;
    return (intake.name || intake.filename || '').toLowerCase().endsWith('.nuspec');
  },
  loadRenderer: () => import('./renderer.js'),
};
