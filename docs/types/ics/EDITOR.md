# Editor Roadmap — ICS (iCalendar)

## Current state

Renderer parses RFC 5545 via `ics.js` (pure client-side): line unfolding, property params, TEXT unescape, date/datetime UTC + TZID, RRULE extraction. Displays a chronological flat list of events with title, when (formatted via `toLocaleString`), location, recurrence label (`rruleText` covers FREQ only), and description. No calendar grid, no recurrence expansion, no timezone conversion UI, no editing.

## Viewer enhancements (no write-back needed)

- **Monthly / weekly calendar grid** — Integrate **FullCalendar** (`fullcalendar.io`, MIT, ~200 KB pre-bundled UMD). Feed the parsed events as `{ title, start, end, allDay }` objects. Toggle between month and week views via a toolbar segmented control. FullCalendar handles date navigation, overflow chips, and responsive layout. — M — lib: FullCalendar core + daygrid + timegrid plugins (pre-bundle to `docs/vendor/fullcalendar/`)

- **Recurrence expansion** — Expand RRULE strings into individual occurrences for the calendar grid view (up to a configurable cap, e.g. 200 instances). Implement FREQ / INTERVAL / BYDAY / BYMONTHDAY / COUNT / UNTIL using a small expansion loop in `ics.js` rather than pulling rrule.js, which is large. For complex rules (BYSETPOS, EXRULE) fall back to showing the rule text. — L — no lib for simple rules; optional: **rrule.js** (~30 KB, MIT) for full RFC compliance if needed

- **Timezone conversion UI** — Add a timezone selector `<select>` populated from `Intl.supportedValuesOf('timeZone')` (Chrome 99+ / Firefox 86+). On change, re-render all event times using `toLocaleString(locale, { timeZone })`. No VTIMEZONE block parsing required — modern `Intl` handles IANA names directly. — M — no lib

- **Event detail modal** — Click any event card (list or grid) to open a modal with full detail: summary, DTSTART / DTEND, RRULE expansion prose, LOCATION, DESCRIPTION (pre-wrap), UID, STATUS, ORGANIZER, ATTENDEE list. — S — no lib

- **VTODO and VJOURNAL support** — `ics.js` currently only collects VEVENTs. Parse VTODO (to-do items with DUE / PERCENT-COMPLETE / STATUS) and VJOURNAL entries and render them in separate tabs. — M — extend `ics.js`

## In-browser editing (download-on-save)

- **Add / edit / delete events** — Event form (summary, start, end, allDay toggle, location, description, recurrence picker). On submit, mutate the in-memory events array. On delete, remove the entry. Export re-serialises to `.ics` using a small `ics-write.js` module (fold long lines at 75 octets per RFC 5545 §3.1, escape TEXT values, format DTSTART/DTEND). — L — no lib; hand-build RFC 5545 serialiser in `ics-write.js`

- **Timezone convert and export** — Convert all event times to a user-selected IANA timezone using `Intl.DateTimeFormat` offsets, rewrite DTSTART/DTEND with the new TZID param, strip VTIMEZONE blocks referencing the old zone, and download the modified `.ics`. Useful for sharing a calendar across regions. — M — no lib; `Intl` only

- **Export as CSV** — "Export to CSV" button writes one row per expanded occurrence: Title, Start, End, Location, Description, Recurrence. Download as `events.csv`. — S — no lib

## Full write-back editing (companion required)

- **In-place event save** — POST the serialised `.ics` back to the companion Axum server to overwrite the source file. Enables the add/edit/delete form to work as a true local calendar editor. — M

- **Watch for external changes** — Companion watches the `.ics` file with `inotify` and pushes a WebSocket notification to re-parse and re-render the grid when the file changes externally (e.g. synced by a CalDAV client). — M

## Shared toolbar / modular note

FullCalendar must be pre-bundled (UMD build) to `docs/vendor/fullcalendar/` to satisfy the zero-off-origin-at-runtime constraint. The RFC 5545 serialiser (`ics-write.js`) is a prerequisite for all in-browser editing features — implement it first and unit-test it against round-trip fixtures. Keep `ics.js` as a read-only parser; do not merge read and write paths.
