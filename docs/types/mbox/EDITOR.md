# Editor Roadmap — MBOX (Mailbox)

## Current state

Renderer splits the mbox via `mboxlib.js` (`From ` envelope detection) then parses each message through the shared `eml/mime.js`. Renders an inbox-style list: message count badge, one row per message showing From / Date / Subject / snippet / attachment count badge. Click-to-expand is not yet implemented — each row is static HTML from the `msg.html` template. No search, no thread grouping, no editing.

## Viewer enhancements (no write-back needed)

- **Click-to-expand message detail** — Toggle a per-row detail panel when a message row is clicked. Reuse the EML renderer (`eml/renderer.js`) to render the expanded view inline rather than duplicating header/body/attachment logic. — S — no lib; import EML render function

- **Search / filter bar** — Add a text input above the list that filters rows client-side on From, Subject, and snippet fields (case-insensitive substring). Debounce at ~150 ms. Show a match count. — S — no lib

- **Date range filter** — Two date pickers (`<input type="date">`) to restrict visible messages to a time window. Parse `msg.date` strings already extracted by `mime.js`. — M — no lib; `new Date(msg.date)` comparison

- **Thread view (group by References / In-Reply-To)** — Group messages by thread: build a `Map<messageId, msg>` then walk `References` and `In-Reply-To` headers to assign thread roots. Render threads as collapsible trees with indent. — L — no lib; RFC 5256 threading algorithm in plain JS

- **Attachment manifest across all messages** — Add an "Attachments" tab that lists every attachment in the mbox (filename, MIME type, size, which message it belongs to) in a flat sortable table. — M — no lib; already extracted by `mime.js`

- **Per-column sort** — Click column headers (From, Subject, Date, size) to re-sort the in-memory array and re-render the list. — S — no lib

## In-browser editing (download-on-save)

- **Delete messages and export reduced .mbox** — Checkbox each message row; a "Delete selected" toolbar button removes them from the in-memory array. Export rebuilds the mbox: prepend each remaining message's raw text with its `From ` envelope line (stored alongside the split) and join with `\n`. Trigger blob download. — M — requires storing the original envelope line in `mboxlib.js` alongside each message

- **Extract all attachments as ZIP** — A "Download all attachments" button decodes every attachment across all messages (base64 / QP via existing `mime.js` path) and packs them into a ZIP using **JSZip** (`jszip.min.js`, ~100 KB pre-bundled). Trigger blob download. — M — lib: JSZip (MIT, well-maintained, no bundler needed)

- **Mark messages read / flag** — Toggle `Status: R` and `X-Status: F` headers per message in the in-memory parsed representation, then reflect visually (bold = unread, star = flagged). Include the changes when exporting. — M — no lib; header string replacement in the raw message text

## Full write-back editing (companion required)

- **In-place delete without full re-export** — Companion patches the mbox file: seeks to the byte offset of the `From ` envelope, truncates that segment. Avoids loading a multi-GB mbox into browser memory for a single delete. — L

- **Append new message** — POST a composed `.eml` to companion; it appends the correct `From ` envelope + message bytes to the end of the mbox file. — M

## Shared toolbar / modular note

The search bar and column-sort controls can share a small `FilterBar` component. Thread grouping should live in a new `mbox-thread.js` module (keep `mboxlib.js` as a pure splitter). JSZip should be pre-bundled to `docs/vendor/jszip.min.js` consistent with the project's zero-off-origin-at-runtime policy.
