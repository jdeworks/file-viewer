export const plugin = {
  id: 'tcl-lang',
  label: 'Tcl',
  tags: ['tcl', 'tk', 'scripting', 'embedded'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!name.endsWith('.tcl') && !name.endsWith('.tk')) return false;
    const text = (intake.text || '').slice(0, 2000);
    if (!text.includes('proc ') && !text.includes('namespace') && !text.includes('package')) return null;
    return true;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Tcl (Tool Command Language) is a dynamic scripting language. Tk is its GUI toolkit extension, used to build cross-platform desktop applications.',
    usedFor: [
      { label: 'tcl.tk', description: 'Tcl/Tk scripting language', href: 'https://www.tcl.tk/' },
      { label: 'wiki.tcl-lang.org', description: 'Tcl community wiki', href: 'https://wiki.tcl-lang.org/' },
    ],
  },
};
export default plugin;
