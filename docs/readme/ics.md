# Calendar (ICS)

> iCalendar event list with formatted dates, recurrence descriptions, locations, and descriptions.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.ics`, `.ical`, `.ifb` |
| MIME type | `text/calendar` |
| Binary / Text | Text |
| Common use | Calendar exports, meeting invites, recurring event schedules |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Event list | ✅ | Title, formatted date range, location, description per event |
| All-day events | ✅ | "all day" label shown |
| Recurring events | ✅ | `RRULE` translated to human-readable text |
| Calendar name | ✅ | `X-WR-CALNAME` shown as heading |
| Location | ✅ | `LOCATION` field shown with map pin |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Event count, first/last event date, all-day count, recurring count, events with location |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export to CSV | ❌ | Not yet implemented |

## Real-World Examples

- [`sample.ics`](../examples/sample.ics) — example calendar with recurring events

## Known Limitations

- Time zones (`TZID` / `VTIMEZONE`) are partially handled — displayed in local browser time
- `VTODO` and `VJOURNAL` components are not rendered (events only)
- Recurrence exceptions (`EXDATE`) not reflected in the summary count

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Calendar month/grid view | Med | Hard | Full calendar widget instead of linear list |
| Export to CSV | Med | Easy | One row per event with title/date/location/description |
| VTODO (task) rendering | Low | Med | Show tasks alongside events |
| Timezone-aware display | Low | Med | `VTIMEZONE` parsing + display in correct TZ |
