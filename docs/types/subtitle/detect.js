import { hasExtension } from '../../core/detect.js';

// Subtitles: SubRip (.srt) and WebVTT (.vtt). Strong on extension; a content sniff catches the
// WEBVTT header or an SRT timecode arrow.
export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, 'srt', 'vtt')) return 0.92;
  const t = intake.textSample || '';
  if (/^﻿?WEBVTT/.test(t)) return 0.85;
  if (/\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}\s*-->\s*\d{1,2}:\d{2}:\d{2}/.test(t)) return 0.7;   // SRT/VTT timecode
  return 0;
}
