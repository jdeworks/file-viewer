export async function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b) return { fields: [] };
  const head = String.fromCharCode(...b.slice(0, 35));
  const ver = head.match(/FICHIER GUITAR PRO v(\d+\.\d+)/)?.[1] || head.match(/FICHIER GUITAR PRO v(\d+)/)?.[1];
  const isGpx = b[0] === 0x50 && b[1] === 0x4b;
  return {
    fields: [
      { label: 'Format', value: isGpx ? 'Guitar Pro 6/7 (GPX)' : ver ? `Guitar Pro v${ver}` : 'Guitar Pro' },
    ],
  };
}
