export const plugin = {
  id: 'fortran-lang',
  label: 'Fortran',
  tags: ['fortran', 'scientific', 'numerical', 'hpc'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const fortranExts = ['.f90', '.f95', '.f03', '.f08', '.f', '.for', '.f77'];
    if (!fortranExts.some((ext) => name.endsWith(ext))) return false;
    const text = (intake.text || '').slice(0, 3000);
    if (!/PROGRAM|MODULE|SUBROUTINE|FUNCTION|END/i.test(text)) return null;
    return true;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Fortran is a compiled, statically typed programming language historically used for numerical and scientific computing, high-performance computing (HPC), and simulation.',
    usedFor: [
      { label: 'fortran-lang.org', description: 'Modern Fortran community', href: 'https://fortran-lang.org/' },
      { label: 'j3-fortran.org', description: 'Fortran standards committee', href: 'https://j3-fortran.org/' },
    ],
  },
};
export default plugin;
