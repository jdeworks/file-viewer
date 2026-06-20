# Editor Roadmap — EML (Email Message)

## Current state

Renderer parses RFC 822 / MIME via `mime.js` (pure client-side). Displays: From / To / Cc / Bcc / Subject / Date / Message-ID header table, plain-text or sandboxed HTML body (iframe, `allow-same-origin` only, external resources stripped), and an attachment list with filename + MIME type + size. No inline preview, no header inspector, no editing.

## Viewer enhancements (no write-back needed)

- **Inline attachment preview** — For each attachment that can be decoded from base64/QP inside `mime.js`, generate a blob URL and render it inline (images via `<img>`, PDFs via `<iframe sandbox>`, text via `<pre>`). Add a toggle to show/hide each preview below the attachment row. — M — no new lib; `URL.createObjectURL(new Blob([bytes]))` after existing base64 decode

- **Full header inspector** — Add a collapsible "All headers" disclosure panel that shows every raw header field, not just the curated seven. Pipe through `decodeWords` for display. Useful for debugging Received chains, X-Mailer, MIME-Version, Content-Type params, etc. — S — no lib

- **Authentication header parser** — Parse `Authentication-Results`, `DKIM-Signature`, `Received-SPF`, and `ARC-*` headers already present in the raw text. Render a small status badge row (pass/fail/neutral) below the main header table: DKIM, SPF, DMARC, ARC. No DNS lookups; this is purely string parsing of what the receiving MTA wrote. — M — no lib; regex extraction only

- **Received-chain timeline** — Parse the `Received:` header stack into a hop list (from / by / date) and show it as a vertical timeline with per-hop latency deltas. — M — no lib

- **HTML / plain-text toggle** — When the message contains both `text/html` and `text/plain` parts, show a segmented control to switch between the two views rather than always preferring HTML. — S — no lib

## In-browser editing (download-on-save)

- **Reply / forward template composer** — Build a minimal compose pane (contenteditable `<div>`) pre-filled with quoted body and headers (`On <date>, <from> wrote:` block). Populate To/Subject automatically for reply; add Fwd: prefix for forward. On save, serialise to a valid `.eml` (plain-text body, RFC 2822 headers, no MIME multipart needed for simple text replies) and trigger a blob download. — M — no lib; hand-build RFC 2822 header block

- **Edit subject / To / Cc** — Inline-edit the displayed header cells (click-to-edit `contenteditable` span). On export, rewrite those headers in the raw `.eml` text using a line-replace pass and download the result. Keep the body and attachments byte-for-byte unchanged. — M — no lib

- **Remove attachments and re-export stripped .eml** — Add a delete button next to each attachment in the list. Track which boundaries to drop. On export, rebuild the MIME structure without the removed parts; if only one body part remains, unwrap the multipart and emit a flat message. This requires a round-trip-safe MIME serialiser (not just the current extractor). — L — no external lib; extend `mime.js` to retain raw boundary blocks

## Full write-back editing (companion required)

- **Save edited .eml in place** — POST the modified `.eml` bytes back to the companion Axum server to overwrite the source file on disk. Enables the reply/forward and header-edit features to act as a true local email editor. — M

- **Flag / label management** — Write `X-Status` / `Status` headers (read, answered, flagged) to the file, mirroring mbox-style flags. Requires companion for in-place header patch without full re-serialise. — S

## Shared toolbar / modular note

The header inspector and authentication badges can share a `<details>` disclosure component already used elsewhere in the viewer. The MIME serialiser needed for attachment removal is a non-trivial addition to `mime.js`; isolate it in a new `mime-write.js` so the read path stays lean. Reply/forward composition does not need the full serialiser — a simple header-block + body concatenation is sufficient for plain-text replies.
