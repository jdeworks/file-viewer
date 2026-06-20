// Docker Buildx Bake plugin: shows build targets with context, dockerfile, tags, and platforms.
export default {
  id: 'docker-bake',
  label: 'docker-bake.hcl',
  match: (intake) => {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return name === 'docker-bake.hcl' || name === 'docker-bake.json' || name === 'bake.hcl';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'docker-bake.hcl / docker-bake.json — Docker Buildx Bake build definition file, specifying multiple build targets with shared configuration.',
    usedFor: [
      { label: 'Docker Buildx Bake', description: 'Build multiple Docker images in parallel with shared configuration', href: 'https://docs.docker.com/build/bake/' },
    ],
  },
};
