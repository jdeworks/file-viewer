import { inspectClip } from './renderer.js';

export async function extractMetadata(intake) {
  const info = await inspectClip(intake);
  try {
    const fields = [
      { label: 'Canvas', value: info.width && info.height ? info.width + ' x ' + info.height + ' px' : 'unknown' },
      { label: 'Layers', value: String(info.layerCount) },
      { label: 'Tables', value: String(info.tables.length) },
    ];
    if (info.created) fields.push({ label: 'Created', value: String(info.created) });
    if (info.modified) fields.push({ label: 'Modified', value: String(info.modified) });
    if (info.preview) fields.push({ label: 'Thumbnail', value: info.preview.mime });
    return { fields };
  } finally {
    try { info.db.close(); } catch {}
  }
}
