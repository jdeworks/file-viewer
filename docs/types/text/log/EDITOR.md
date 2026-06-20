# Editor Roadmap — Log

## Current state
Solid colorized viewer. Renders each line into a `<pre>`-like container using
HTML templates (container.html / row.html via core/template.js). Classifies
lines by severity (l-error, l-warn, l-info, l-debug) via regex keyword matching.
Highlights leading timestamps (ISO 8601 and HH:MM:SS variants) with a distinct
span. Has a `logStats()` utility export (error/warn/info/debug/timestamped
counts) used by metadata.js.

## Viewer enhancements (no write-back needed)

- **ANSI escape code rendering** — Strip or render ANSI color/bold/dim/reset
  sequences (`ESC[...m`) commonly produced by systemd, docker logs, and Jest.
  Map the 16 standard colors to CSS color values. No external dep needed — M
- **Filter / grep with highlight** — A toolbar input that filters visible rows
  to those matching a regex or plain string, and highlights the matching span
  within each visible row. Debounce the regex compile — S
- **Severity filter checkboxes** — Toggle error/warn/info/debug level visibility
  independently. Counts per level shown on each checkbox (from logStats) — S
- **Relative time display** — Parse the first timestamp as t0 and show a
  `+HH:MM:SS.mmm` relative offset column to the left of each timestamped row.
  Toggle between absolute and relative — M
- **Timestamp jump** — A time-range picker (from/to) that jumps the scroll
  position to the first line in range, graying out out-of-range lines — M
- **Line count / line number gutter** — Optional gutter column showing line
  numbers, useful when referencing log lines in a bug report — S
- **Tail mode** — Auto-scroll to the bottom on initial render and keep focus
  there. Toggle button "Follow tail" / "Scroll freely" — S
- **Log stats summary bar** — Show the logStats output (error/warn/info/debug
  counts) in a compact bar at the top of the viewer. Currently only in metadata;
  bring it into the renderer header — S

## In-browser editing (download-on-save)

- **Redact / mask rows** — Checkbox per row (or regex-bulk-select) to replace
  matching lines with `[REDACTED]` before downloading. Useful for sharing logs
  with PII — M
- **Annotate lines** — Click a line number to add a sticky note (stored in
  memory). Download annotated log with `# NOTE: ...` comment lines inserted
  above annotated rows — M

## Full write-back editing (companion required)

- **Live tail from file** — Companion watches the file with inotify and streams
  new lines via SSE. The viewer appends them in real time with follow-tail — L
- **Log rotation viewer** — Companion lists and serves all rotated log files
  (`.1`, `.2`, `.gz`) for the same base name; viewer stitches them into a
  continuous timeline — M

## Shared toolbar / modular note
ANSI rendering and severity filtering are the two highest-value standalone
additions. Implement ANSI as a pure `ansi-to-html.js` utility (< 60 lines)
that the row renderer calls before escaping; this also benefits the terminal
output in crash logs. The filter input and severity checkboxes share state —
design them as a single toolbar component that updates a CSS class on the
container to show/hide rows by class, avoiding a full re-render.
