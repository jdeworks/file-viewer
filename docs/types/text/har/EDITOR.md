# Editor Roadmap — HAR (HTTP Archive)

## Current state
Solid viewer. Parses the HAR JSON format, maps entries to categories (xhr, js,
css, image, other), computes per-entry start offset and duration from
`startedDateTime`. Renders a summary card row (request count, total transferred,
total duration), a waterfall chart via Chart.js (horizontal bars, with canvas
fallback), category filter buttons, a sortable request table (method, URL,
status badge, MIME, size, duration), and dark-mode styling. Up to full entry
count displayed. Clicking a table row opens a request detail panel (URL, MIME,
per-phase timing breakdown, query string, request/response headers, and
length-capped request/response body previews). Header/cookie/query values that
look sensitive (auth, cookie, token, API key, session, etc., matched by name)
are redacted by NAME in both the table and the detail panel — the Download
button still serves the untouched original file.

## Viewer enhancements (no write-back needed)

- **Stacked waterfall with timing breakdown** — Each HAR entry has a `timings`
  object (dns, connect, ssl, send, wait, receive); the detail panel already
  renders this per-phase breakdown for the *selected* entry. Still open: apply
  the same breakdown to the main aggregate waterfall itself — replace the
  current single-bar-per-request Chart.js dataset with stacked segments per
  phase using distinct colors — M
- **Filter by status code range** — Add status filter chips (2xx / 3xx / 4xx /
  5xx / 0) alongside the existing category filters — S
- **Filter by domain** — Extract hostname from each URL and add a domain
  multi-select filter. Useful for isolating third-party resource timing — M
- **Performance budget indicators** — Configurable thresholds (e.g., TTFB > 300
  ms flagged red, total > 3 s flagged yellow) shown as overlay lines on the
  waterfall — S
- **Summary statistics panel** — P50/P90/P99 of request durations, slowest 5
  requests, largest 5 by transferred size, cache hit ratio
  (`_fromCache` / `status 304`) — M
- **Timeline ruler with real timestamps** — Show absolute time labels (HH:MM:SS)
  on the waterfall X-axis in addition to relative ms offsets — S
- **Export filtered subset** — Download a new HAR JSON containing only the
  currently visible (filtered) entries. Pure JSON.stringify of the filtered
  entries array — S

## In-browser editing (download-on-save)

- **Request URL redactor** — Inline edit URLs to anonymize PII (tokens, session
  IDs) before sharing a HAR. Changes propagate to both the table and the JSON
  on download — M
- **Header redactor** — Strip or replace specific header values (Authorization,
  Cookie, Set-Cookie) across all matching requests. Useful compliance tool — S
- **Entry annotator** — Add a `_comment` field to any entry (standard HAR
  extension); displayed as a note column in the table and preserved on
  download — S

## Full write-back editing (companion required)

- **Live re-capture diff** — Companion re-runs the page via a headless browser
  and overlays the new HAR timeline on top of the current one for before/after
  comparison — L

## Shared toolbar / modular note
Chart.js is already in use (`/vendor/chartjs/chart.umd.js`). The stacked
waterfall is a natural extension of the existing Chart.js bar dataset — add one
`data` array per timing phase with stacked: true. The request detail panel now
lives inline in `renderer.js`; if it keeps growing, split it into a separate
`har-detail.js` component to keep the main renderer under the LOC cap.
