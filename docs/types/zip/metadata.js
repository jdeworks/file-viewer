import { readZip, fmtSize } from './ziplib.js';

export async function extract(intake) {
  try {
    const z = await readZip(intake);
    return [
      { label: 'Files', value: String(z.files.length) },
      { label: 'Folders', value: String(z.folders.length) },
      { label: 'Uncompressed', value: fmtSize(z.totalU) },
      { label: 'Compression', value: z.ratio + '% smaller' },
    ];
  } catch {
    return [{ label: 'Archive', value: 'unreadable' }];
  }
}
