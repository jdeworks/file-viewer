export default {
  id: 'license',
  label: 'LICENSE',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop();
    return name === 'LICENSE' || name === 'LICENSE.txt' || name === 'LICENSE.md' || name === 'LICENCE';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Software license file — identifies the open-source license type, copyright holder, and year.',
  },
};
