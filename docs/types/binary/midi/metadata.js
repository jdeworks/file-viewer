import { parseMidi } from './renderer.js';

export async function extractMetadata(intake) {
  const midi = parseMidi(intake);
  return {
    fields: [
      { label: 'Format', value: 'Type ' + midi.format },
      { label: 'Tracks', value: String(midi.declaredTracks) },
      { label: 'PPQN', value: String(midi.ppqn) },
      { label: 'BPM', value: midi.bpmText },
      { label: 'Time signature', value: midi.timeSignature },
      { label: 'Duration', value: midi.durationSeconds.toFixed(2) + 's' },
      { label: 'Notes', value: String(midi.totalNotes) },
      { label: 'Unique pitches', value: String(midi.uniquePitches) },
    ],
  };
}
