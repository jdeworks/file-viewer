// MSBuild .props/.targets enhancement: matches SDK-style shared property/target files.
export default {
  id: 'msbuild-props',
  label: 'MSBuild',
  match(intake, baseType) {
    if (baseType?.id !== 'xml') return false;
    const n = (intake.name || intake.filename || '').toLowerCase();
    const base = n.split('/').pop();
    // Must end in .props or .targets but NOT be a .csproj/.vbproj/.fsproj or Directory.Build.* file
    if (!base.endsWith('.props') && !base.endsWith('.targets')) return false;
    if (base.endsWith('.csproj') || base.endsWith('.vbproj') || base.endsWith('.fsproj')) return false;
    if (base === 'directory.build.props' || base === 'directory.build.targets' || base === 'directory.packages.props') return false;
    // Require <Project> root element (checked lazily via text heuristic to avoid full parse here)
    const text = intake.text || '';
    return /<Project[\s>]/i.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
};
