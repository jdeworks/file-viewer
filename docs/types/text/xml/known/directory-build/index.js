// MSBuild shared property file enhancement: parses Directory.Build.props / Directory.Build.targets
// / Directory.Packages.props and surfaces the property groups and package references that apply
// across all projects in the directory tree.
export default {
  id: 'directory-build',
  label: 'MSBuild Shared Props',
  match(intake, baseType) {
    if (baseType?.id !== 'xml') return false;
    const n = (intake.name || intake.filename || '').toLowerCase();
    const base = n.split('/').pop();
    return base === 'directory.build.props'
      || base === 'directory.build.targets'
      || base === 'directory.packages.props';
  },
  loadRenderer: () => import('./renderer.js'),
};
