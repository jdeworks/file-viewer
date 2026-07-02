// Keynote's real filesystem extension is `.key` (not `.keynote`, which does not exist in the
// wild). `.key` also happens to be claimed by the PEM/certificate type, but that detector only
// scores an extension-only match at 0.6 (0.85 needs a DER 0x30 lead byte) while this detector
// requires ZIP magic (PK\x03\x04) + binary and scores 0.92, so a real Keynote ZIP always wins.
const EXTS = { '.pages': 'Pages', '.numbers': 'Numbers', '.key': 'Keynote' };

export function detect(intake) {
  if (!intake.isBinary) return 0;
  const ext = '.' + (intake.filename || '').split('.').pop().toLowerCase();
  if (!EXTS[ext]) return 0;
  // must have ZIP magic: 50 4B 03 04
  const b = intake.bytes;
  if (b.length < 4 || b[0] !== 0x50 || b[1] !== 0x4B || b[2] !== 0x03 || b[3] !== 0x04) return 0;
  return 0.92;
}

export { EXTS };
