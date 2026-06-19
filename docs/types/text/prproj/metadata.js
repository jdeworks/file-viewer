async function decompressGzip(bytes) {
  const ds = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const chunks = [];
  let done, value;
  const reader = ds.readable.getReader();
  while ({ done, value } = await reader.read(), !done) chunks.push(value);
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.length; }
  return new TextDecoder().decode(out);
}

export async function extractMetadata(intake) {
  let xml = '';
  try {
    if (intake.isBinary && intake.bytes) xml = await decompressGzip(intake.bytes);
    else xml = intake.text || '';
  } catch { /* ignore decompression error */ }

  const get = (rx) => xml.match(rx)?.[1]?.trim() || null;
  const count = (tag) => (xml.match(new RegExp(`<${tag}[\\s>/]`, 'gi')) || []).length;
  const fields = [
    { label: 'Format', value: 'Adobe Premiere Pro Project' },
    { label: 'Version', value: get(/PremiereData[^>]*Version="([^"]*)"/) },
    { label: 'Sequences', value: String(count('Sequence') || '') || null },
    { label: 'Clips', value: String(count('ClipProjectItem') || '') || null },
  ].filter((f) => f.value);
  return { fields };
}
