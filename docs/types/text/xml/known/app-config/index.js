// app.config enhancement: .NET Framework application configuration.
export default {
  id: 'app-config',
  label: '.NET App Config',
  match(intake, baseType) {
    if (baseType?.id !== 'xml') return false;
    return (intake.filename || intake.name || '').split('/').pop().toLowerCase() === 'app.config';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'app.config — .NET Framework application configuration file. Stores connection strings, app settings, supported runtime versions, and custom config sections.',
    usedFor: [{ label: '.NET Framework', description: 'Configure .NET Framework desktop/console/WCF apps', href: 'https://learn.microsoft.com/en-us/dotnet/framework/configure-apps/file-schema/application-configuration-file' }],
  },
};
