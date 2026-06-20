export default {
  id: 'falco-rules',
  label: 'Falco Rules',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const text = intake.text || '';
    return text.includes('- rule:') && text.includes('condition:') && text.includes('output:') && (text.includes('syscall') || text.includes('evt.type'));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Falco runtime security rules define conditions for detecting suspicious behavior in containers and Linux systems, with output templates and priority levels.',
    usedFor: [{ label: 'Falco Rules', description: 'Define runtime security rules with conditions, output templates, and priorities for container and syscall-level threat detection.', href: 'https://falco.org/docs/rules/' }],
  },
};
