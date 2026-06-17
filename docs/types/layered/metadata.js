export async function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 26) return {};
  // PSD: header at offset 0
  if (b[0] === 0x38 && b[1] === 0x42 && b[2] === 0x50 && b[3] === 0x53) {
    const version = (b[4] << 8) | b[5];
    const channels = (b[10] << 8) | b[11];
    const height = (b[14] << 24) | (b[15] << 16) | (b[16] << 8) | b[17];
    const width  = (b[18] << 24) | (b[19] << 16) | (b[20] << 8) | b[21];
    const depth  = (b[22] << 8) | b[23];
    const colorModes = ['Bitmap','Grayscale','Indexed','RGB','CMYK','','','','Multichannel','Duotone','Lab'];
    const colorMode  = colorModes[(b[24] << 8) | b[25]] || 'Unknown';
    return { format: version === 2 ? 'PSB' : 'PSD', width, height, channels, depth, colorMode };
  }
  return {};
}
