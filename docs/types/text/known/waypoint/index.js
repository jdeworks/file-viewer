export const plugin = {
  id: 'waypoint',
  label: 'HashiCorp Waypoint',
  tags: ['deployment', 'hashicorp', 'devops'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'waypoint.hcl';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'HashiCorp Waypoint application deployment configuration — defines projects, apps, build plugins, deploy platforms, release methods, and URL service settings.',
    usedFor: [{ label: 'Waypoint', description: 'HashiCorp application deployment and delivery platform', href: 'https://developer.hashicorp.com/waypoint/docs' }],
  },
};
export default plugin;
