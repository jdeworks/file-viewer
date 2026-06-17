// DjVu metadata extractor. Reads page count from the IFF chunk structure without
// fully decoding the image data.
export async function extract(intake) {
  const b = intake.bytes;
  if (!b || b.length < 16) return [{ label: 'Format', value: 'DjVu' }];

  try {
    // Count DJVU subform chunks to determine number of pages.
    // In multi-page (DJVM) files each page is a FORM:DJVU chunk.
    // In single-page (DJVU) files there's exactly one page.
    const sub = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (sub === 'DJVU') {
      // Single-page document
      return [
        { label: 'Format', value: 'DjVu' },
        { label: 'Pages', value: '1' },
      ];
    }
    if (sub === 'DJVM') {
      // Multi-page: scan for FORM chunks after offset 16
      let pageCount = 0;
      let i = 16;
      while (i + 8 < b.length) {
        const id = String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]);
        const size = (b[i + 4] << 24) | (b[i + 5] << 16) | (b[i + 6] << 8) | b[i + 7];
        if (id === 'FORM' && i + 12 < b.length) {
          const formType = String.fromCharCode(b[i + 8], b[i + 9], b[i + 10], b[i + 11]);
          if (formType === 'DJVU') pageCount++;
        }
        // Advance past chunk (size + header + padding for odd sizes)
        i += 8 + size + (size & 1 ? 1 : 0);
        if (size <= 0) break; // safety
      }
      return [
        { label: 'Format', value: 'DjVu (multi-page)' },
        { label: 'Pages', value: String(pageCount || '?') },
      ];
    }
    return [{ label: 'Format', value: 'DjVu' }];
  } catch {
    return [{ label: 'Format', value: 'DjVu' }];
  }
}
