export const plugin = {
  id: 'gdscript-lang',
  label: 'GDScript',
  tags: ['gdscript', 'godot', 'gamedev', 'gd'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!name.endsWith('.gd')) return false;
    const text = (intake.text || '').slice(0, 2000);
    if (!text.includes('extends ') && !text.includes('func ') && !text.includes('class_name ')) return null;
    return true;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'GDScript is a high-level, dynamically typed scripting language built into the Godot game engine. It has a Python-like syntax and is designed for fast iteration in game development.',
    usedFor: [
      { label: 'godotengine.org', description: 'Official Godot Engine home', href: 'https://godotengine.org/' },
      { label: 'GDScript reference', description: 'GDScript language reference', href: 'https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/' },
    ],
  },
};
export default plugin;
