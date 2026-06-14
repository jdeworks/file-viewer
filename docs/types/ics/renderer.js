// Calendar preview: parse the iCalendar source and render its events as a chronological
// list (title, when, location, description, recurrence). All values are escaped — calendar
// text is untrusted. Markup lives in sibling .html templates (doc/event) and is filled via
// core/template.js. Rendered in the sandboxed iframe like the other text types.
import { parseICS, fmtDate, rruleText } from './ics.js';
import { loadTemplate, fill, esc } from '../../core/template.js';

const DOC = new URL('./doc.html', import.meta.url);
const EVENT = new URL('./event.html', import.meta.url);

export async function render(intake, _ctx) {
  const [docTpl, eventTpl] = await Promise.all([loadTemplate(DOC), loadTemplate(EVENT)]);
  const { calName, events } = parseICS(intake.text || '');
  const head = '<div class="ics-head">📅 ' + esc(calName || 'Calendar') + ' · ' + events.length + ' event' + (events.length === 1 ? '' : 's') + '</div>';
  if (!events.length) return { bodyHtml: fill(docTpl, { head, body: '<p class="ics-empty">No events found.</p>' }), hadUnsafe: false };

  const body = events.map((ev) => {
    const when = fmtDate(ev.start) + (ev.end && ev.end.date ? ' – ' + fmtDate(ev.end) : '') + (ev.allDay ? ' · all day' : '');
    const loc = ev.location ? '<div class="ics-loc">📍 ' + esc(ev.location) + '</div>' : '';
    const rrule = ev.rrule ? '<div class="ics-rrule">↻ ' + esc(rruleText(ev.rrule)) + '</div>' : '';
    const desc = ev.description ? '<div class="ics-desc">' + esc(ev.description) + '</div>' : '';
    return fill(eventTpl, { summary: ev.summary, when, loc, rrule, desc });
  }).join('');

  return { bodyHtml: fill(docTpl, { head, body }), hadUnsafe: false };
}
