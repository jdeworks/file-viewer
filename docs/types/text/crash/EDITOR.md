# Editor Roadmap — Crash (Apple .crash / .ips)

## Current state
Rich viewer — the most complete renderer in this group at 18 KB. Handles both
the classic fixed-field `.crash` text format and the newer JSON-based `.ips`
format from iOS 15+. Renders a dark-themed hero card (exception type, code,
process, device, OS, date), an exception detail card, a per-thread backtrace
with collapsed non-crashed threads, CPU register dump (collapsible), extended
report details (collapsible), and binary image list (collapsible). App-owned
frames are highlighted in cyan with bold weight.

## Viewer enhancements (no write-back needed)

- **Stack trace highlighting by library category** — Color-code frame libraries
  into tiers: app frames (already cyan), OS frameworks (e.g., UIKit, libSystem),
  Swift runtime, C++ runtime, and unknown. Apply distinct muted colors per tier
  using a prefix-match table — S
- **Symbol resolution hints** — When a frame has a bare address (no symbol name),
  show a tooltip suggesting the dSYM workflow (`atos -arch ... -o MyApp.dSYM ...
  <addr>`) with the specific command pre-filled from parsed binary image data — M
- **Thread grouping summary** — A collapsible table listing all threads with
  their queue name, frame count, and whether they were blocked on a lock (detect
  `pthread_mutex` / `os_unfair_lock` in top frame). Helps triage multi-thread
  deadlocks — M
- **Binary image lookup** — Click a frame's library name to jump to its entry in
  the Binary Images section and show UUID, version, and path in a tooltip. — S
- **Demangler for C++ / Swift symbols** — Run mangled symbols (starting with
  `_Z` for C++ or `$s` for Swift) through a WASM demangler for readability.
  Key libs: `swift-demangler.wasm` or `c++filt` WASM port. Lazy-load only if
  mangled symbols are detected — L
- **Crash address overlay in binary image** — If the exception code contains an
  address (e.g., `0x0000000000000010`), highlight which binary image it falls
  in (by comparing to image start/end addresses) and call it out in the hero
  card — M
- **Export as Markdown** — Generate a GitHub-friendly Markdown crash report
  (exception type, top 10 crashed thread frames, device/OS) for pasting into
  issue trackers — S

## In-browser editing (download-on-save)

- **Redact personal fields** — Strip or replace Incident Identifier, UUID, and
  user-specific paths (e.g., `/Users/<name>/`) before downloading/sharing.
  Classic format: regex over key: value lines. IPS: JSON key clear — S
- **Annotation layer** — Add a freeform note above any thread or frame that gets
  serialized as a `# ANNOTATION:` comment line in the output crash file — M
- **Symbol paste-in** — For app frames with bare addresses, paste the dSYM
  symbolication output and have the viewer update the frame's `symName` display
  inline and in the downloaded file — M

## Full write-back editing (companion required)

- **Local dSYM symbolication** — Companion invokes `atos` or `llvm-symbolizer`
  with the dSYM on disk and streams resolved symbols back to the viewer, updating
  all frames in place — L
- **Crash database logging** — Companion appends parsed crash metadata (exception
  type, OS, process, UUID) to a local SQLite DB (leveraging the existing
  sql.js viewer), enabling cross-crash trending — L

## Shared toolbar / modular note
The current renderer is already among the most polished in the codebase. The
highest-value next steps are the symbol resolution hint (pure text, no deps) and
the Markdown export (pure text). The C++/Swift demangler WASM is the longest
pole for a true power-user workflow; gate it behind a "Demangle symbols" button
so the WASM is never fetched for plain Objective-C crashes. The redaction feature
is a good candidate to implement first as it has compliance value and zero
external dependencies.
