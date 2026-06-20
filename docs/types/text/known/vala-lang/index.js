export const plugin = {
  id: 'vala-lang',
  label: 'Vala',
  tags: ['vala', 'gnome', 'compiled', 'object-oriented'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.vala') || name.endsWith('.vapi')) return true;
    const text = intake.text || '';
    // Require Vala-specific namespace imports or C-style modifiers (avoids matching Lisp defclass, Kotlin class, etc.)
    return /using\s+GLib|using\s+Gtk|public\s+static\s+int\s+main|\bpublic\s+class\s+\w|\bprivate\s+class\s+\w/.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Vala source file — a modern programming language using the GObject type system, designed for GNOME development with C performance.',
    usedFor: [
      { label: 'Vala reference', description: 'Official Vala language reference manual', href: 'https://docs.vala.dev/' },
      { label: 'GNOME developer documentation', description: 'GNOME platform development resources', href: 'https://developer.gnome.org/' },
    ],
  },
};
export default plugin;
