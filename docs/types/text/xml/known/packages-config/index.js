// packages.config enhancement: NuGet packages list for .NET Framework projects.
export default {
  id: 'packages-config',
  label: 'NuGet packages.config',
  match(intake, baseType) {
    if (baseType?.id !== 'xml') return false;
    return (intake.filename || intake.name || '').split('/').pop().toLowerCase() === 'packages.config';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'packages.config — legacy NuGet package reference format for .NET Framework projects. Lists all installed packages with their versions and target framework.',
    usedFor: [{ label: 'NuGet', description: 'Manage NuGet packages for .NET Framework projects', href: 'https://learn.microsoft.com/en-us/nuget/reference/packages-config' }],
  },
};
