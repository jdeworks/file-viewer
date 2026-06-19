// NuGet.Config enhancement: shows package sources, active source, fallback folders, and options.
export default {
  id: 'nuget-config',
  label: 'NuGet Config',
  match(intake, baseType) {
    if (baseType?.id !== 'xml') return false;
    const n = (intake.name || '').toLowerCase();
    return n === 'nuget.config' || n === 'nuget.config.xml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'NuGet.Config — configures package sources, credentials, and behavior for the NuGet package manager.',
    usedFor: [{ label: 'NuGet', description: 'Configure package sources and restore behavior for .NET projects', href: 'https://learn.microsoft.com/en-us/nuget/reference/nuget-config-file' }],
  },
};
