// Calendar preview: parse the iCalendar source and render its events as a chronological
// list (title, when, location, description, recurrence). All values are escaped — calendar
// text is untrusted. Rendered in the sandboxed iframe like the other text types.
import { parseICS, fmtDate, rruleText } from './ics.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function render(intake, _ctx) {
  const { calName, events } = parseICS(intake.text || '');
  const head = '<div class="ics-head">📅 ' + esc(calName || 'Calendar') + ' · ' + events.length + ' event' + (events.length === 1 ? '' : 's') + '</div>';
  if (!events.length) return { bodyHtml: '<div class="ics-doc">' + head + '<p class="ics-empty">No events found.</p></div>', hadUnsafe: false };

  const cards = events.map((ev) => {
    const when = fmtDate(ev.start) + (ev.end && ev.end.date ? ' – ' + fmtDate(ev.end) : '') + (ev.allDay ? ' · all day' : '');
    let card = '<div class="ics-event"><div class="ics-title">' + esc(ev.summary) + '</div>'
      + '<div class="ics-when">' + esc(when) + '</div>';
    if (ev.location) card += '<div class="ics-loc">📍 ' + esc(ev.location) + '</div>';
    if (ev.rrule) card += '<div class="ics-rrule">↻ ' + esc(rruleText(ev.rrule)) + '</div>';
    if (ev.description) card += '<div class="ics-desc">' + esc(ev.description) + '</div>';
    return card + '</div>';
  }).join('');

  return { bodyHtml: '<div class="ics-doc">' + head + cards + '</div>', hadUnsafe: false };
}
