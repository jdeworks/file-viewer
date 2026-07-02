export function detect(intake) {
  const b = intake.bytes;
  const ext = intake.filename?.split('.').pop()?.toLowerCase();

  if (b && b.length >= 6) {
    // .npy magic: \x93NUMPY
    if (b[0] === 0x93 && b[1] === 0x4E && b[2] === 0x55 &&
        b[3] === 0x4D && b[4] === 0x50 && b[5] === 0x59) return 0.99;

    // .npz: ZIP magic + extension
    if (ext === 'npz' && b[0] === 0x50 && b[1] === 0x4B) return 0.92;
  }

  // Extension-only fallback (e.g. no byte content available yet, as when the
  // example catalog probes types before a file is actually loaded).
  if (ext === 'npy') return 0.6;
  if (ext === 'npz') return 0.5;
  return 0;
}
