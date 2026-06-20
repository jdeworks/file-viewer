# Editor Roadmap — URL (Internet Shortcut / .url file)

## Current state
Comprehensive URL inspector: parses standard HTTP/HTTPS URLs, bare query strings (`?foo=bar`), `mailto:` addresses, and `data:` URIs. Renders a structured breakdown of scheme, host, port, path segments, query parameters (with copy buttons), and fragment. Detects JWT tokens in query values and decodes header/payload. Flags OAuth parameters. Pretty-prints URL-encoded JSON values. Handles multi-URL files (3+ URLs: renders a summary table plus individual expandable detail blocks). Raw URL is shown in a monospace box with a copy button.

Security note: favicon fetch is off-origin — not implemented and should not be added.

## Viewer enhancements (no write-back needed)
- QR code — generate a QR code for the URL entirely in-browser using `qrcode.js` (pre-bundle `docs/vendor/qrcode.min.js`, ~14 KB); render as `<canvas>` or SVG below the URL card — S — qrcode.js
- UTM / tracking parameter decoder — detect common tracking params (`utm_source`, `utm_medium`, `utm_campaign`, `fbclid`, `gclid`, `ref`, `source`, etc.) and show them in a dedicated "Tracking" section with plain-English labels — S — no lib
- URL shortener note — detect known shortener domains (bit.ly, t.co, tinyurl.com, etc.) and add a note that the destination is unknown without a network request (none will be made) — S — no lib
- Punycode / IDN display — if the hostname contains `xn--` ACE prefixes, decode using the browser's `URL` API (already used) and display the Unicode form alongside — S — native `URL`
- Data URI preview — already handles images; extend to text/html (show sanitized HTML), text/plain (show decoded text), application/json (pretty-print) — S — native APIs
- JWT expiry check — for detected JWTs, parse the `exp` claim and show a valid/expired badge with time-to-expiry — S — no lib (already decodes payload)
- Credential leak warning — scan query params for keys matching `password`, `pass`, `secret`, `key`, `token`, `api_key`, `apikey` and flag them with a security warning — S

## In-browser editing (download-on-save)
- URL builder / editor — form with fields for scheme, host, port, path, and an editable query parameter table (add/delete/edit rows); live-updates the assembled URL and raw display — M — no lib; uses `URL` and `URLSearchParams`
- Edit `.url` file fields — the Internet Shortcut format is `[InternetShortcut]\nURL=https://...`; add an inline input for the URL value and download a patched `.url` file — S — no lib
- Add/remove query parameters — table with editable key/value rows that update the assembled URL in real time and offer `.url` download — M — `URLSearchParams`
- Export query params as JSON — button to download the current params as `{ key: value }` JSON — S — no lib
- Export as cURL command — assemble `curl -G --data-urlencode 'key=value' https://host/path` from the current URL — S — no lib

## Full write-back editing (companion required)
- Save edited `.url` to original path via companion `/write-back`

## Shared toolbar / modular note
`qrcode.js` must be pre-bundled to `docs/vendor/qrcode.min.js` (zero off-origin CDN policy). QR canvas should include a download-as-PNG button. The URL builder editor and the existing inspector should share the same `<URL>` parse step; render mode switches between "inspect" and "build" via a toggle tab.
