// Conda environment.yml plugin: shows name, channels, python version, and dependency list.
export default {
  id: 'conda-env',
  label: 'environment.yml',
  match: (intake, baseType) => {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name !== 'environment.yml' && name !== 'environment.yaml') return false;
    if (baseType && baseType.id !== 'yaml') return false;
    const text = intake.text || '';
    return text.includes('channels:') || text.includes('dependencies:') || text.includes('conda');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'environment.yml — Conda environment specification defining name, channels, and package dependencies.',
    usedFor: [
      { label: 'Conda environment', description: 'Create or update a Conda environment with conda env create -f environment.yml', href: 'https://docs.conda.io/projects/conda/en/latest/user-guide/tasks/manage-environments.html' },
    ],
  },
};
