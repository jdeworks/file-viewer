import { parseICS, fmtDate } from './ics.js';

export function extract(intake) {
  const { calName, events } = parseICS(intake.text || '');
  const rows = [{ label: 'Calendar', value: calName || '—' }, { label: 'Events', value: String(events.length) }];
  const withDates = events.filter((e) => e.start && e.start.date);
  if (withDates.length) {
    rows.push({ label: 'First', value: fmtDate(withDates[0].start) });
    rows.push({ label: 'Last', value: fmtDate(withDates[withDates.length - 1].start) });
  }
  return rows;
}
