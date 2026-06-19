export function detect(intake) {
  if (!intake.isBinary || !intake.bytes) return 0;
  const b = intake.bytes;
  if (b.length < 4) return 0;

  // ELF: \x7fELF
  if (b[0] === 0x7f && b[1] === 0x45 && b[2] === 0x4c && b[3] === 0x46) return 0.98;

  // PE/COFF: MZ magic (Windows)
  if (b[0] === 0x4d && b[1] === 0x5a) return 0.85;

  // Mach-O: check all 4 magic variants
  const m32be = b[0] === 0xfe && b[1] === 0xed && b[2] === 0xfa && b[3] === 0xce;
  const m64be = b[0] === 0xfe && b[1] === 0xed && b[2] === 0xfa && b[3] === 0xcf;
  const m32le = b[0] === 0xce && b[1] === 0xfa && b[2] === 0xed && b[3] === 0xfe;
  const m64le = b[0] === 0xcf && b[1] === 0xfa && b[2] === 0xed && b[3] === 0xfe;
  const mFat  = b[0] === 0xca && b[1] === 0xfe && b[2] === 0xba && b[3] === 0xbe;
  if (m32be || m64be || m32le || m64le || mFat) return 0.98;

  return 0;
}
