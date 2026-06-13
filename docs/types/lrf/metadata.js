export async function extract(intake) {
  const b = intake.bytes;
  const ver = (b && b.length >= 10) ? (b[8] | (b[9] << 8)) : 0;
  return [
    { label: 'Format', value: 'Sony LRF (BBeB)' },
    { label: 'Version', value: ver ? String(ver) : '—' },
    { label: 'Size', value: (intake.size / 1024).toFixed(1) + ' KB' },
  ];
}
