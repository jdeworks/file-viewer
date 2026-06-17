import { parseAls } from './renderer.js';

export async function extractMetadata(intake) {
  const data = await parseAls(intake);
  const fields = [
    { label: 'BPM', value: data.bpm || 'unknown' },
    { label: 'Time signature', value: data.timeSignature },
    { label: 'Audio tracks', value: String(data.counts.audio) },
    { label: 'MIDI tracks', value: String(data.counts.midi) },
    { label: 'Return tracks', value: String(data.counts.return) },
    { label: 'Master tracks', value: String(data.counts.master) },
    { label: 'Total tracks', value: String(data.tracks.length) },
    { label: 'Clips', value: String(data.counts.clips) },
  ];
  if (data.plugins.length) fields.push({ label: 'Plugins', value: data.plugins.join(', ') });
  return { fields };
}
