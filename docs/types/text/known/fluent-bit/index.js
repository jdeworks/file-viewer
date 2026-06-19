export default {
  id: 'fluent-bit',
  label: 'Fluent Bit config',
  match(intake, baseType) {
    const n = (intake.filename || intake.name || '').split('/').pop().toLowerCase();
    return n === 'fluent-bit.conf';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Fluent Bit log processor configuration — defines SERVICE settings, INPUT sources, FILTER plugins, and OUTPUT destinations.',
    usedFor: [{ label: 'Fluent Bit', description: 'Lightweight and high-performance log processor and forwarder', href: 'https://docs.fluentbit.io/manual/administration/configuring-fluent-bit' }],
  },
};
