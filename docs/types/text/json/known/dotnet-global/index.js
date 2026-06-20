// global.json enhancement: .NET SDK version pinning. Shows SDK version, roll-forward policy,
// prerelease flag, and MSBuild SDK mappings.
export default {
  id: 'dotnet-global',
  label: '.NET global.json',
  match(intake, baseType) {
    if (baseType?.id !== 'json') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'global.json') return false;
    const p = intake.parsed || {};
    return !!(p.sdk?.version || p['msbuild-sdks']);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'global.json — pins the .NET SDK version for the project, controlling which SDK version dotnet commands use.',
    usedFor: [{ label: '.NET SDK pin', description: 'Control which .NET SDK version is used for builds', href: 'https://learn.microsoft.com/en-us/dotnet/core/tools/global-json' }],
  },
};
