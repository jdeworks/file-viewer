export const plugin = {
  id: 'arduino-sketch',
  label: 'Arduino Sketch',
  tags: ['arduino', 'embedded', 'microcontroller', 'iot', 'c++'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!name.endsWith('.ino')) return false;
    const text = (intake.text || '').slice(0, 2000);
    if (!text.includes('void setup()') && !text.includes('void loop()') && !text.includes('#include')) return null;
    return true;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Arduino sketches are C++ programs for Arduino microcontrollers, always containing setup() (runs once) and loop() (runs repeatedly) functions.',
    usedFor: [
      { label: 'arduino.cc', description: 'Official Arduino language reference and documentation', href: 'https://www.arduino.cc/reference/en/' },
      { label: 'Arduino IDE', description: 'Development environment for Arduino sketches', href: 'https://www.arduino.cc/en/software' },
    ],
  },
};
export default plugin;
