export default {
  id: 'falco-config',
  label: 'Falco Config',
  tags: ['falco', 'security', 'runtime', 'cloud-native', 'yaml'],
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.text || '';
    const hasContent = text.includes('rules_file') || text.includes('output_timeout') || text.includes('falco_libs');
    return n === 'falco.yaml' || n === 'falco.yml' || (n === 'config.yaml' && hasContent);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Falco runtime security configuration file controlling rules files, outputs (stdout, file, program, gRPC), log level, and syscall event handling.',
    usedFor: [{ label: 'Falco Config', description: 'Configure Falco runtime security engine: rules files, alert outputs, gRPC API, and syscall monitoring settings.', href: 'https://falco.org/docs/configuration/' }],
  },
};
