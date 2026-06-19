function hasAscii(b, off, s) {
  for (let i = 0; i < s.length; i++) if (b[off + i] !== s.charCodeAt(i)) return false;
  return true;
}

function hasExtension(intake, ...exts) {
  const name = (intake.filename || '').toLowerCase();
  return exts.some((e) => name.endsWith('.' + e));
}

export function detect(intake) {
  const b = intake.bytes;
  if (!b || b.length < 8) return 0;

  // Arrow IPC file format: starts with continuation marker + 'ARROW1\0\0' magic
  // The first 4 bytes are 0xFFFFFFFF (continuation), next 4 vary; then at offset 4: schema length
  // More reliably: the magic 'ARROW1' appears at offset 0 after the magic pad bytes
  // Actually: Arrow IPC File: starts with magic 'ARROW1' at byte 0 (6 bytes) + \0\0 padding = 8 bytes
  if (hasAscii(b, 0, 'ARROW1')) {
    return hasExtension(intake, 'arrow', 'ipc') ? 0.98 : 0.92;
  }

  // Feather v1: 'FEA1' magic at offset 0 and at the last 4 bytes
  if (hasAscii(b, 0, 'FEA1')) {
    return hasExtension(intake, 'feather', 'arrow') ? 0.98 : 0.92;
  }

  // Feather v2 uses Arrow IPC format (ARROW1 magic)

  const ext = hasExtension(intake, 'arrow', 'feather', 'ipc');
  if (ext) return 0.5;
  return 0;
}
