// Subtitle (.srt/.vtt) preview: a readable, timecoded cue list. Markup lives in sibling .html
// templates (doc/cue) and is filled via core/template.js — cue text is HTML-escaped before
// newlines are converted to <br> tags (the only safe HTML inserted). Rendered in the sandboxed iframe.
import { parseSubtitles, fmtTime } from './sublib.js';
import { loadTemplate, fill, esc, fillEach } from '../../../core/template.js';

const DOC = new URL('./doc.html', import.meta.url);
const CUE = new URL('./cue.html', import.meta.url);

export async function render(intake, _ctx) {
  const cues = parseSubtitles(intake.text || '');
  if (!cues.length) return { bodyHtml: '<p class="sub-empty">No subtitle cues found.</p>', hadUnsafe: false };

  const [docTpl, cueTpl] = await Promise.all([loadTemplate(DOC), loadTemplate(CUE)]);

  const last = cues[cues.length - 1];
  const meta = cues.length + ' cue' + (cues.length === 1 ? '' : 's') + ' · ends ' + fmtTime(last.end);
  const rows = fillEach(cueTpl, cues, (c) => ({
    index: c.index,
    start: fmtTime(c.start),
    end: fmtTime(c.end),
    text: esc(c.text).replace(/\n/g, '<br>'),
  }));

  return { bodyHtml: fill(docTpl, { meta, rows }), hadUnsafe: false };
}
