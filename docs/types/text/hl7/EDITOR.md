# Editor Roadmap — HL7 / FHIR

## Current state
HL7 v2.x viewer. Parses pipe-delimited segments, extracts MSH header summary
(message type, version, sending/receiving app, control ID, datetime), displays
a stats bar (segment count, unique types, version), summary table, and a
segment list table with type label and field preview (first 5 fields, 80-char
slice). Handles \r, \n, and \r\n line endings. FHIR (JSON-based) is not yet
handled.

## Viewer enhancements (no write-back needed)

- **Human-readable structured view** — Instead of raw pipe-separated values, map
  well-known field positions to their HL7 field names (MSH, PID, PV1, OBR, OBX
  field dictionaries already partially present) and render each segment as a
  labeled key/value table. Show only populated fields — M
- **Full field name dictionaries** — Extend the existing MSH_FIELDS and
  PID_FIELDS arrays to cover OBR, OBX, PV1, DG1, AL1, IN1, and NTE. Static JS
  object, no external dep — M
- **OBX value rendering** — OBX.5 (observation value) varies by OBX.2 value type
  (NM = numeric, ST = string, TX = text, CWE = coded, ED = encapsulated data).
  Render NM with units from OBX.6, CWE as `code ^ display ^ system` formatted
  nicely, TX as a paragraph — M
- **Segment type filter / search** — Dropdown to show only a selected segment
  type (e.g., all OBX rows), and a text search across all field values — S
- **FHIR JSON view** — Detect `"resourceType"` in JSON intake and render as a
  structured card tree: top-level resource info card, then collapsible sections
  per resource key. No FHIR schema validation needed at this stage — M
- **Encoding characters display** — Show the MSH-2 encoding characters
  (component, repetition, escape, subcomponent separators) in the header card so
  users understand complex field structures — S
- **Message flow diagram** — For acknowledgment messages (ACK) show a two-node
  send/receive diagram. Purely decorative but helps QA engineers orient — S

## In-browser editing (download-on-save)

- **Form-based field editor** — For MSH and PID segments, render a proper form
  with labeled inputs mapped to field positions. On save, serialize back to
  pipe-delimited lines with the correct field separators, including subcomponent
  handling (^~\&) — M
- **OBX value editor** — Editable NM/ST/TX values in the observation result
  segment. Critical for building test messages from templates — M
- **Add / delete segment** — Append a new segment row (from a type dropdown) or
  delete an existing one; re-index set IDs (MSH control ID auto-increments) — M
- **Message template library** — A dropdown of pre-built HL7 message skeletons
  (ADT^A01 admit, ORU^R01 result, ORM^O01 order) that pre-populate a new
  document — S

## Full write-back editing (companion required)

- **Round-trip file save** — Edit MSH/PID fields and save directly back via the
  companion endpoint. Useful for integration engine debugging where the source
  file is on a shared network path — S (given companion)

## Shared toolbar / modular note
The field dictionary (segment name → array of field labels) is the foundation
for both the human-readable view and the form editor. Extract it as
`hl7-fields.js` so both features share one source of truth. FHIR JSON is
architecturally separate enough to warrant a future `fhir/` type directory;
for now a best-effort fallback inside the HL7 renderer is fine.
