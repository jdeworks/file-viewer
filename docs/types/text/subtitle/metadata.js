import { parseSubtitles, fmtTime, isVtt } from './sublib.js';

export function extract(intake) {
  const cues = parseSubtitles(intake.text || '');
  const spoken = cues.reduce((n, c) => n + Math.max(0, c.end - c.start), 0);
  const out = [
    { label: 'Format', value: isVtt(intake.text || '') ? 'WebVTT' : 'SubRip (SRT)' },
    { label: 'Cues', value: String(cues.length) },
  ];
  if (cues.length) {
    out.push({ label: 'First cue', value: fmtTime(cues[0].start) });
    out.push({ label: 'Duration', value: fmtTime(cues[cues.length - 1].end) });
    out.push({ label: 'Spoken time', value: fmtTime(spoken) });
  }
  return out;
}
