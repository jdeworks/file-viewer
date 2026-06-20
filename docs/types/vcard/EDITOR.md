# Editor Roadmap — vCard (VCF Contact)

## Current state

Renderer parses RFC 6350 / 3.0 / 2.1 via `vcardlib.js` (pure client-side): line unfolding, param parsing (including 2.1 flag-style TYPE), QUOTED-PRINTABLE decode, and contact extraction. Displays one card per contact: FN, ORG/title, emails (mailto: links), phones (tel: links), addresses (text), URLs, birthday, note. Photo presence is detected (`hasPhoto: true`) but not rendered. Multi-card `.vcf` files show all cards stacked. No QR code, no map embed, no editing.

## Viewer enhancements (no write-back needed)

- **QR code of vCard data** — For each card, render a QR code encoding the full vCard text block (BEGIN:VCARD … END:VCARD). Use **qrcode.js** (`davidshimjs/qrcodejs`, MIT, ~20 KB, no dependency). Place below the card with a toggle button. Scan on phone to import contact. — S — lib: qrcode.js (pre-bundle to `docs/vendor/qrcode.min.js`)

- **Static OpenStreetMap embed** — If a card has at least one ADR, construct a static map tile URL pointing at `tile.openstreetmap.org` using the address string geocoded client-side via the **Nominatim** API (`https://nominatim.openstreetmap.org/search?q=…&format=json`). Render the nearest tile as an `<img>`. Note: Nominatim is an off-origin request; only enable behind a user-triggered "Show map" button so the zero-off-origin-at-rest policy is respected for passive render. — M — lib: none; plain `fetch` to Nominatim + OSM tile URL construction

- **Photo display** — `vcardlib.js` sets `hasPhoto: true` but discards the data. Extend the parser to retain the raw base64 PHOTO value and MEDIATYPE param. Render as a rounded `<img>` avatar at the top of the card. — M — extend `vcardlib.js`; no lib

- **Batch list view** — When a `.vcf` contains more than one card, add a sidebar list (name + org) alongside the detail panel (currently cards are stacked). Click a name to scroll / focus its card. Include a search input that filters the list. — M — no lib

- **Social profile links** — Parse `X-SOCIALPROFILE`, `X-TWITTER`, `IMPP`, and `X-SKYPE` properties and render them as labelled links with recognisable icons (inline SVG or CSS). — S — extend `vcardlib.js` to collect `extras` array

## In-browser editing (download-on-save)

- **Inline field editing** — Click any field value (name, phone, email, address, note, org, title, birthday) to replace it with a text input. On blur / Enter, update the in-memory card object. Export serialises the modified card(s) back to RFC 6350 `.vcf` format using a new `vcf-write.js` module (fold lines at 75 octets, escape commas/semicolons, encode non-ASCII as UTF-8 with CHARSET param for 2.1 compat). — M — no lib; hand-build RFC 6350 serialiser in `vcf-write.js`

- **Add / remove fields** — "Add email", "Add phone", "Add address" buttons append a new editable row to the card. A delete icon on each row removes it. All changes live in the in-memory card array until export. — M — no lib; depends on inline editing above

- **Export subset of contacts** — Checkboxes in the batch list view. "Export selected" button serialises only checked cards to a new `.vcf` and triggers blob download. Useful for extracting a subset from a large address book export. — S — depends on `vcf-write.js` and batch list view

- **Merge duplicate cards** — Detect duplicates by normalised FN (case-fold, strip punctuation) or matching email/phone. Show a "Duplicates found" banner with a merge dialog: side-by-side diff of two cards, checkboxes to pick which value wins per field. Merge into one card in-memory, delete the other, offer export. — L — no lib; fuzzy name normalisation + field-level merge UI

- **Export as CSV / vCard 3.0** — "Export CSV" writes columns: Name, Org, Title, Emails, Phones, Addresses, URLs, Note, Birthday. "Export as vCard 3.0" downgrades vCard 4.0 features (KIND, GENDER, ANNIVERSARY) to 3.0-compatible fields. — S — no lib

## Full write-back editing (companion required)

- **Save edited .vcf in place** — POST the re-serialised `.vcf` bytes to the companion Axum server to overwrite the source file. Required for the inline editing workflow to persist without a manual download. — M

- **Add new contact to existing .vcf** — Append a new BEGIN:VCARD … END:VCARD block to the file via companion. Enables using the viewer as a local address book editor. — S — depends on companion write endpoint

## Shared toolbar / modular note

qrcode.js must be pre-bundled to `docs/vendor/qrcode.min.js` (consistent with zero-off-origin-at-runtime). The RFC 6350 serialiser (`vcf-write.js`) is a prerequisite for all in-browser editing features — build and test it against round-trip fixtures first. Nominatim geocoding is inherently off-origin; gate it strictly behind an explicit user gesture and document the privacy implication (address string leaves the browser). The batch list view and inline editing are independent tracks that can be built in parallel.
