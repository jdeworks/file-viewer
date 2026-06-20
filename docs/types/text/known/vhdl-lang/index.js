export const plugin = {
  id: 'vhdl-lang',
  label: 'VHDL',
  tags: ['vhdl', 'hdl', 'hardware', 'fpga', 'rtl', 'digital-design'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!name.endsWith('.vhd') && !name.endsWith('.vhdl')) return false;
    const text = (intake.text || '').slice(0, 3000);
    if (!/entity\s/i.test(text) && !/architecture\s/i.test(text)) return null;
    return true;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'VHDL (VHSIC Hardware Description Language) is a hardware description language used to model and simulate digital circuits for FPGA and ASIC design.',
    usedFor: [
      { label: 'IEEE VHDL (1076)', description: 'IEEE standard for VHDL hardware description language', href: 'https://ieeexplore.ieee.org/document/8938196' },
      { label: 'VHDL Guide', description: 'VHDL language reference and tutorials', href: 'https://vhdlguide.com/' },
    ],
  },
};
export default plugin;
