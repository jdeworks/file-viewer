// schema.prisma / *.prisma enhancement: shows generator, datasource, models, and enums.
export default {
  id: 'prisma-schema',
  label: 'Prisma Schema',
  match(intake) {
    const n = (intake.name || '').toLowerCase();
    return n === 'schema.prisma' || n.endsWith('.prisma');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Prisma schema file — defines the data model, datasource, and generator configuration for Prisma ORM.',
    usedFor: [{ label: 'Prisma ORM', description: 'Define database models and generate a type-safe client', href: 'https://www.prisma.io/docs/concepts/components/prisma-schema' }],
  },
};
