export const plugin = {
  id: 'capnp',
  label: "Cap'n Proto",
  tags: ['capnproto', 'schema', 'serialization', 'rpc'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    return name.endsWith('.capnp');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: "Cap'n Proto is an extremely fast data interchange format and capability-based RPC system. Schema files define structs, interfaces, enums, and constants.",
    usedFor: [{ label: 'capnproto.org', description: "Cap'n Proto serialization and RPC schema format", href: 'https://capnproto.org/' }],
  },
};
export default plugin;
