import { hasExtension, mimeMatches } from '../../core/detect.js';

export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, 'ics', 'ical', 'ifb', 'icalendar')) return 0.95;
  if (mimeMatches(intake, 'text/calendar')) return 0.9;
  const t = intake.textSample || '';
  if (/^BEGIN:VCALENDAR/im.test(t)) return /BEGIN:VEVENT/i.test(t) ? 0.85 : 0.6;
  return 0;
}
