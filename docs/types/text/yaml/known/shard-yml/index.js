export default {
  id: 'shard-yml',
  label: 'Crystal Shard',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.filename || '').split('/').pop();
    return n === 'shard.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Crystal language shard manifest — defines the shard name, version, dependencies, and dev dependencies.',
    usedFor: [
      { label: 'Crystal shards', description: 'Libraries and tools built with the Crystal language', href: 'https://crystal-lang.org/reference/guides/writing_shards.html' },
    ],
  },
};
