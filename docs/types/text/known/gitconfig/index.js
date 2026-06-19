// Git config enhancement: show [user], [remote], [branch] and other sections in an INI viewer.
// Matches .gitconfig (home dir), .git/config (repo config), and bare 'config' inside .git/.
export default {
  id: 'gitconfig',
  label: 'Git config',
  match: (intake) => {
    const f = (intake.filename || '').split('/').pop();
    return (
      f === '.gitconfig' ||
      (f === 'config' && /\.git\/config$/.test(intake.filename || '')) ||
      /^gitconfig$/.test(f)
    );
  },
  loadRenderer: () => import('./render.js'),
};
