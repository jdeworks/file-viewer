export default {
  id: 'nomad-job',
  label: 'Nomad Job',
  match(intake) {
    const n = (intake.filename || intake.name || '').split('/').pop().toLowerCase();
    if (n.endsWith('.nomad') || n.endsWith('.nomad.hcl')) return true;
    const text = intake.textSample || intake.text || '';
    return text.includes('job "') && text.includes('group "') && text.includes('task "');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'HashiCorp Nomad job specification — defines job name, type, datacenters, task groups, drivers, resource requirements, and service registrations.',
    usedFor: [{ label: 'HashiCorp Nomad', description: 'Schedule and run containerized, non-containerized, and batch workloads across a cluster.', href: 'https://developer.hashicorp.com/nomad/docs/job-specification' }],
  },
};
