// Subtitle (.srt/.vtt) preview: a readable, timecoded cue list. Rendered as escaped text in the
// sandboxed iframe (cues are plain text; inline VTT tags are stripped in the parser).
import { parseSubtitles, fmtTime } from './sublib.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function render(intake, _ctx) {
  const cues = parseSubtitles(intake.text || '');
  if (!cues.length) return { bodyHtml: '<p class="sub-empty">No subtitle cues found.</p>', hadUnsafe: false };

  const last = cues[cues.length - 1];
  const meta = cues.length + ' cue' + (cues.length === 1 ? '' : 's') + ' · ends ' + fmtTime(last.end);
  const rows = cues.map((c) =>
    '<div class="sub-cue"><div class="sub-time"><span class="sub-idx">' + c.index + '</span>'
    + esc(fmtTime(c.start)) + ' → ' + esc(fmtTime(c.end)) + '</div>'
    + '<div class="sub-text">' + esc(c.text).replace(/\n/g, '<br>') + '</div></div>').join('');

  return { bodyHtml: '<div class="sub-doc"><div class="sub-meta">' + esc(meta) + '</div>' + rows + '</div>', hadUnsafe: false };
}
