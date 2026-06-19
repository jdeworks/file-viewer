// web.config enhancement: IIS/ASP.NET Framework configuration.
export default {
  id: 'web-config',
  label: 'IIS/ASP.NET Config',
  match(intake, baseType) {
    if (baseType?.id !== 'xml') return false;
    return (intake.name || '').toLowerCase() === 'web.config';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'web.config — IIS and ASP.NET Framework application configuration file. Controls authentication, connection strings, app settings, HTTP handlers, and more.',
    usedFor: [{ label: 'ASP.NET / IIS', description: 'Configure ASP.NET Framework apps and IIS server settings', href: 'https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/iis/web-config' }],
  },
};
