import { parseICS, fmtDate } from './ics.js';

export function extract(intake) {
  const { calName, events } = parseICS(intake.text || '');
  const rows = [{ label: 'Calendar', value: calName || '—' }, { label: 'Events', value: String(events.length) }];
  const withDates = events.filter((e) => e.start && e.start.date);
  const recurring = events.filter((e) => e.rrule).length;
  const allDay = events.filter((e) => e.allDay).length;
  const located = events.filter((e) => e.location).length;
  if (withDates.length) {
    rows.push({ label: 'First', value: fmtDate(withDates[0].start) });
    rows.push({ label: 'Last', value: fmtDate(withDates[withDates.length - 1].start) });
  }
  rows.push({ label: 'All-day events', value: String(allDay) });
  rows.push({ label: 'Recurring events', value: String(recurring) });
  rows.push({ label: 'With location', value: String(located) });
  return rows;
}
