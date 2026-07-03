export const plugin = {
  id: 'vala-lang',
  label: 'Vala',
  tags: ['vala', 'gnome', 'compiled', 'object-oriented'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.vala') || name.endsWith('.vapi')) return true;
    const text = intake.text || '';
    // Only Vala-idiomatic GObject namespace imports — "public class"/"static int main" are
    // generic C-family idioms shared by Java/C#/Kotlin and caused false-positive collisions
    // on any extension-less or misidentified file containing them.
    return /using\s+GLib\s*;|using\s+Gtk\s*;/.test(text);
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
