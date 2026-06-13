import { parseSubtitles, fmtTime, isVtt } from './sublib.js';

export function extract(intake) {
  const cues = parseSubtitles(intake.text || '');
  const out = [
    { label: 'Format', value: isVtt(intake.text || '') ? 'WebVTT' : 'SubRip (SRT)' },
    { label: 'Cues', value: String(cues.length) },
  ];
  if (cues.length) out.push({ label: 'Duration', value: fmtTime(cues[cues.length - 1].end) });
  return out;
}
