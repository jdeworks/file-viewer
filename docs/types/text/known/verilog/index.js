// Coq proof files also use .v — detect and reject them
function isCoq(text) {
  return /\b(Theorem|Proof\.|Qed\.|Lemma)\b/.test(text || '');
}

function hasVerilogContent(text) {
  if (!text) return false;
  if (isCoq(text)) return false;
  return /\bmodule\s+\w/.test(text);
}

function isSystemVerilog(ext, text) {
  if (ext === 'sv' || ext === 'svh') return true;
  // Heuristic: SV-specific keywords in content
  return /\b(logic|always_ff|always_comb|always_latch|interface\s+\w|class\s+\w|package\s+\w|typedef\s+struct|typedef\s+enum)\b/.test(text || '');
}

export const plugin = {
  id: 'verilog',
  label: 'Verilog / SystemVerilog',
  tags: ['hdl', 'verilog', 'systemverilog', 'hardware', 'fpga', 'rtl'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const ext = name.includes('.') ? name.split('.').pop() : '';
    if (ext === 'sv' || ext === 'svh') {
      // SV extension — still require module keyword to be safe
      return hasVerilogContent(intake.text);
    }
    if (ext === 'v') {
      // .v is also Coq — guard carefully
      return hasVerilogContent(intake.text);
    }
    // Content-based detection for unlabelled files
    return hasVerilogContent(intake.text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Verilog / SystemVerilog hardware description language file — describes digital circuits at the RTL or behavioral level for simulation and FPGA/ASIC synthesis.',
    usedFor: [
      { label: 'IEEE Verilog (1364)', description: 'Original Verilog hardware description language standard', href: 'https://ieeexplore.ieee.org/document/954909' },
      { label: 'IEEE SystemVerilog (1800)', description: 'Extended superset adding OOP, assertions, and design verification', href: 'https://ieeexplore.ieee.org/document/10458102' },
    ],
  },
};
export default plugin;
