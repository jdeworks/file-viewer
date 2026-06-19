function u16le(b, o) { return b[o] | (b[o+1] << 8); }
function u32le(b, o) { return (b[o] | (b[o+1]<<8) | (b[o+2]<<16) | (b[o+3]<<24)) >>> 0; }
function u16be(b, o) { return (b[o] << 8) | b[o+1]; }
function u32be(b, o) { return ((b[o]<<24)|(b[o+1]<<16)|(b[o+2]<<8)|b[o+3]) >>> 0; }
function hex(n) { return '0x' + n.toString(16); }

const ELF_MACH = {
  0x02:'SPARC',0x03:'x86',0x08:'MIPS',0x14:'PowerPC',0x16:'PowerPC64',
  0x28:'ARM',0x32:'IA-64',0x3e:'x86-64',0x75:'AVR',0xb7:'AArch64 (ARM64)',0xf3:'RISC-V',
};
const PE_MACHINE = {
  0x014c:'x86 (i386)',0x0200:'IA-64',0x8664:'x86-64 (AMD64)',
  0xaa64:'AArch64 (ARM64)',0x01c4:'ARM (Thumb-2)',0x01c0:'ARM LE',
};
const MACHO_CPU = {
  7:'x86',0x01000007:'x86-64',12:'ARM',0x0100000c:'AArch64 (Apple Silicon)',
  18:'PowerPC',0x01000012:'PowerPC64',
};

export async function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 4) return { fields: [] };

  let format = 'Unknown', arch = null, bits = null;

  if (b[0]===0x7f && b[1]===0x45 && b[2]===0x4c && b[3]===0x46) {
    const le = b[5] === 1;
    const r16 = le ? (o) => u16le(b, o) : (o) => u16be(b, o);
    format = `ELF ${b[4]===2?'64-bit':'32-bit'}`;
    bits = b[4] === 2 ? '64-bit' : '32-bit';
    arch = ELF_MACH[r16(18)] || hex(r16(18));
  } else if (b[0]===0x4d && b[1]===0x5a) {
    const peOff = u32le(b, 0x3c);
    if (peOff + 6 < b.length && b[peOff]===0x50 && b[peOff+1]===0x45) {
      const machine = u16le(b, peOff + 4);
      const optMagic = peOff + 24 < b.length ? u16le(b, peOff + 24) : 0;
      format = `PE32${optMagic === 0x020b ? '+' : ''} (${u16le(b, peOff + 22) & 0x2000 ? 'DLL' : 'EXE'})`;
      arch = PE_MACHINE[machine] || hex(machine);
      bits = optMagic === 0x020b ? '64-bit' : '32-bit';
    } else {
      format = 'PE/COFF (MZ)';
    }
  } else {
    const isLE = b[0]===0xce||b[0]===0xcf;
    const r32 = isLE ? (o) => u32le(b, o) : (o) => u32be(b, o);
    const magic = r32(0);
    const isFat = magic===0xcafebabe;
    format = isFat ? 'Mach-O Fat Binary' : `Mach-O ${(magic===0xcffaedfe||b[0]===0xcf)?'64-bit':'32-bit'}`;
    if (!isFat) arch = MACHO_CPU[r32(4)] || hex(r32(4));
    bits = isFat ? null : (magic===0xcffaedfe||b[0]===0xcf) ? '64-bit' : '32-bit';
  }

  return {
    fields: [
      { label: 'Format', value: format },
      { label: 'Architecture', value: arch },
      { label: 'Bit width', value: bits },
    ].filter((f) => f.value),
  };
}
